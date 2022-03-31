import path from 'path';
import { app } from 'electron';
import { pipe } from 'fp-ts/function';
import { FileType, fileTypes } from '../../../common/petz/file-types';
import {
  mapObjectValuesStringKey,
  objectEntries,
} from '../../../common/object';
import { fromPromiseProperties } from '../../../common/promise';
import { directoryExists, getPathsInDir } from '../file/file-util';
import { fsPromises } from '../util/fs-promises';
import { Result } from '../../../common/result';
import { A, E, Either } from '../../../common/fp-ts/fp';
import { isNully } from '../../../common/null';
import { resourceInfoToResult, ResourceManager } from './resource-manager';
import { eitherToNullable } from '../../../common/fp-ts/either';
import { taggedValue, TaggedValue } from '../../../common/tagged-value';

const projectFolderName = 'Deus Hex Projects';

function getProjectFolder() {
  return path.join(app.getPath('userData'), projectFolderName);
}

function fileTypeToProjectTypeFolder(type: FileType) {
  return `${fileTypes[type].name} Projects`;
}

function projectTypeFolder(type: FileType) {
  const projFolder = getProjectFolder();
  return path.join(projFolder, fileTypeToProjectTypeFolder(type));
}

function projectFolders(id: ProjectId) {
  const folder = path.normalize(projectTypeFolder(id.type));
  const root = path.join(folder, id.name);
  const originalFolder = path.join(root, 'original');
  const currentFolder = path.join(root, 'current');
  const backupsFolder = path.join(root, 'backups');
  return {
    root,
    originalFolder,
    currentFolder,
    backupsFolder,
  };
}

function typeFromFilePath(filePath: string): FileType | null {
  const ext = path.extname(filePath);
  const found = objectEntries(fileTypes).find((it) => {
    return it[1].extension === ext;
  });
  return found?.[0] ?? null;
}

export interface ProjectId {
  type: FileType;
  name: string;
}

export interface ProjectResult {
  id: ProjectId;
  info: Either<string, ProjectInfo>;
}

interface ProjectFileInfo {
  path: string;
  savedDate: Date;
  name: string;
}

export interface ProjectInfo {
  id: ProjectId;
  current: ProjectFileInfo;
  original: ProjectFileInfo | null;
  backups: ProjectFileInfo[];
}

export interface EditorFileInfo {
  path: string;
  type: FileType;
  projectId: ProjectId | null;
}

export type EditorParams =
  | TaggedValue<'invalid', { file: string; message: string }>
  | TaggedValue<'info', EditorFileInfo>;

export type ProjectsByType = Record<FileType, Result<ProjectResult[]>>;

export function getProjectManagerFolders() {
  const root = getProjectFolder();
  const byType = mapObjectValuesStringKey(fileTypes, (_, t) =>
    projectTypeFolder(t)
  );
  return {
    root,
    byType,
  };
}

export class ProjectManager {
  constructor(private resourceManager: ResourceManager) {}

  async fileToEditorParams(fileRaw: string): Promise<EditorParams> {
    const file = path.normalize(fileRaw);
    const mkInvalid = (message: string) =>
      taggedValue('invalid', { file, message });
    const type = typeFromFilePath(file);
    if (isNully(type)) {
      return mkInvalid(`Could not derive file type from path`);
    }
    const mCurrentDir = path.parse(file).dir;
    const mNameDir = path.parse(mCurrentDir).dir;
    const mName = path.parse(mNameDir).base;
    const mId = { name: mName, type };
    const projInfo = await this.getProjectById(mId);
    if (E.isLeft(projInfo.info)) {
      return taggedValue('info', {
        path: file,
        type,
        projectId: null,
      });
    }
    return taggedValue('info', {
      path: file,
      type,
      projectId: mId,
    });
  }

  async createProjectFromFile(filePath: string, name: string) {
    const type = typeFromFilePath(filePath);
    if (isNully(type)) {
      return E.left(`Could not derive file type from path ${filePath}`);
    }
    const projectId: ProjectId = { type, name };
    const projectPaths = projectFolders(projectId);
    await fsPromises.mkdir(projectPaths.root);
    await fsPromises.mkdir(projectPaths.originalFolder);
    await fsPromises.mkdir(projectPaths.currentFolder);
    await fsPromises.mkdir(projectPaths.backupsFolder);
    const origFileName = path.basename(filePath);

    await fsPromises.copyFile(
      filePath,
      path.join(projectPaths.originalFolder, origFileName)
    );
    await fsPromises.copyFile(
      filePath,
      path.join(projectPaths.currentFolder, origFileName)
    );
    return E.right(projectId);
  }

  async getProjects(): Promise<ProjectsByType> {
    return fromPromiseProperties(
      mapObjectValuesStringKey(fileTypes, (_, k) => {
        return this.getProjectsForType(k);
      })
    );
  }

  private async getProjectsForType(type: FileType) {
    const folder = projectTypeFolder(type);
    const foo = await directoryExists(folder);
    if (!(E.isRight(foo) && foo.right)) {
      await fsPromises.mkdir(folder, { recursive: true });
    }
    const paths = await getPathsInDir(folder);
    if (E.isLeft(paths)) return paths;
    const results = paths.right.map((it) => {
      return this.getProjectByFolderPath(type, it);
    });
    return E.right(await Promise.all(results));
  }

  private async getProjectByFolderPath(type: FileType, projectFolder: string) {
    const projectName = path.basename(projectFolder);
    return this.getProjectById({ type, name: projectName });
  }

  private async getProjectById(id: ProjectId): Promise<ProjectResult> {
    const projectPaths = projectFolders(id);
    const current = await this.getProjectFileInfo(
      id.type,
      projectPaths.currentFolder
    );
    const retErrResult = (val: E.Left<string>): ProjectResult => {
      return {
        id,
        info: val,
      };
    };
    if (E.isLeft(current)) {
      return retErrResult(current);
    }
    const original = await this.getProjectFileInfo(
      id.type,
      projectPaths.originalFolder
    );
    const backups = await this.getBackups(id.type, projectPaths.backupsFolder);

    return {
      id,
      info: E.right({
        id,
        current: current.right,
        original: eitherToNullable(original),
        backups,
      }),
    };
  }

  private async getBackups(
    type: FileType,
    folder: string
  ): Promise<ProjectFileInfo[]> {
    const paths = await getPathsInDir(folder);
    if (E.isLeft(paths)) return [];
    const promises = paths.right.map(async (it) => {
      return this.getProjectFileInfo(type, it);
    });
    const results = await Promise.all(promises);
    return A.rights(results);
  }

  private async getProjectFileInfo(
    type: FileType,
    folder: string
  ): Promise<Result<ProjectFileInfo>> {
    const paths = await getPathsInDir(folder);
    if (E.isLeft(paths)) return paths;
    const foundPath = paths.right.find((it) => {
      return path.extname(it) === fileTypes[type].extension;
    });
    if (isNully(foundPath)) {
      return E.left(
        `No file found matching extension ${fileTypes[type].extension}`
      );
    }
    const stat = await fsPromises.stat(foundPath);

    const resInfo = await this.resourceManager.getResourceInfo(foundPath, type);
    return pipe(
      resourceInfoToResult(resInfo),
      E.map((it) => {
        return {
          path: foundPath,
          savedDate: stat.ctime,
          name: it.itemName,
        };
      })
    );
  }
}
