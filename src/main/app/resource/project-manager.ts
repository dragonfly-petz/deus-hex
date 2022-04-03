import path from 'path';
import { app } from 'electron';
import { pipe } from 'fp-ts/function';
import { FileType, fileTypes } from '../../../common/petz/file-types';
import {
  mapObjectValuesStringKey,
  objectEntries,
  objectValues,
} from '../../../common/object';
import { fromPromiseProperties } from '../../../common/promise';
import { directoryExists, getPathsInDir } from '../file/file-util';
import { fsPromises } from '../util/fs-promises';
import { Result } from '../../../common/result';
import { A, E, Either } from '../../../common/fp-ts/fp';
import { isNotNully, isNully } from '../../../common/null';
import { resourceInfoToResult, ResourceManager } from './resource-manager';
import { eitherToNullable } from '../../../common/fp-ts/either';
import { taggedValue, TaggedValue } from '../../../common/tagged-value';
import { DF } from '../../../common/df';
import { FileWatcher } from '../file/file-watcher';
import { sortByNumeric } from '../../../common/array';
import { globalLogger } from '../../../common/logger';

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
  const externalBackupsFolder = path.join(root, 'externalBackups');
  return {
    root,
    originalFolder,
    currentFolder,
    backupsFolder,
    externalBackupsFolder,
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
  itemName: string;
  fileName: string;
}

export interface ProjectInfo {
  id: ProjectId;
  current: ProjectFileInfo;
  original: ProjectFileInfo | null;
  backups: ProjectFileInfo[];
  projectPaths: ReturnType<typeof projectFolders>;
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

export interface CreateProjectResult {
  projectId: ProjectId;
  currentFile: string;
}

export class ProjectManager {
  constructor(
    private resourceManager: ResourceManager,
    private fileWatcher: FileWatcher
  ) {}

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
    if (E.isLeft(projInfo.info) || projInfo.info.right.current.path !== file) {
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

  async createProjectFromFile(
    filePath: string,
    name: string
  ): Promise<Result<CreateProjectResult>> {
    const type = typeFromFilePath(filePath);
    if (isNully(type)) {
      return E.left(`Could not derive file type from path ${filePath}`);
    }
    const projectId: ProjectId = { type, name };
    const projectPaths = await this.getAndCreateProjectFolders(projectId);
    const origFileName = path.basename(filePath);

    await fsPromises.copyFile(
      filePath,
      path.join(projectPaths.originalFolder, origFileName)
    );
    const currentFile = path.join(projectPaths.currentFolder, origFileName);
    await fsPromises.copyFile(filePath, currentFile);
    return E.right({ projectId, currentFile });
  }

  private async getAndCreateProjectFolders(projectId: ProjectId) {
    const projectPaths = projectFolders(projectId);
    const folderPaths = objectValues(projectPaths);

    await Promise.all(
      folderPaths.map(async (it) => {
        const res = await directoryExists(it);
        if (E.isLeft(res)) {
          await fsPromises.mkdir(it);
        } else if (!res.right) {
          throw new Error(
            `Could not create directory ${it} because it already exists but is not a directory`
          );
        }
      })
    );
    return projectPaths;
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
    const projectPaths = await this.getAndCreateProjectFolders(id);
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
        projectPaths,
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
          itemName: it.itemName,
          fileName: path.parse(foundPath).base,
        };
      })
    );
  }

  async save(filePath: string, projectId: ProjectId, data: Buffer) {
    const { info } = await this.getProjectById(projectId);
    if (E.isLeft(info)) {
      return info;
    }
    if (info.right.current.path !== filePath) {
      return E.left('Expected supplied path to match project current path');
    }
    await this.fileWatcher.writeFileSuspendWatcher(filePath, data);
    return E.right(true);
  }

  async saveBackup(filePath: string, projectId: ProjectId, data: Buffer) {
    const { info } = await this.getProjectById(projectId);
    if (E.isLeft(info)) {
      return info;
    }
    if (info.right.current.path !== filePath) {
      return E.left('Expected supplied path to match project current path');
    }
    const { backupsFolder } = info.right.projectPaths;
    return this.createBackupInFolder(backupsFolder, info.right, data);
  }

  async saveExternalChangeBackup(filePath: string, projectId: ProjectId) {
    const { info } = await this.getProjectById(projectId);
    if (E.isLeft(info)) {
      return info;
    }
    if (info.right.current.path !== filePath) {
      return E.left('Expected supplied path to match project current path');
    }
    const { externalBackupsFolder } = info.right.projectPaths;
    const data = await fsPromises.readFile(filePath);
    const res = this.createBackupInFolder(
      externalBackupsFolder,
      info.right,
      data
    );
    await this.cleanBackups(externalBackupsFolder, 3);
    return res;
  }

  private async cleanBackups(folderPath: string, leaveLastN: number) {
    const paths = await getPathsInDir(folderPath);
    if (E.isLeft(paths)) return;
    const pathsWithDates = paths.right
      .map((it) => {
        const { base } = path.parse(it);
        try {
          const date = DF.parse(base, 'yyyy-MM-dd HH-mm-ss', new Date());
          return { folderPath: it, date };
        } catch {
          return null;
        }
      })
      .filter(isNotNully);
    sortByNumeric(pathsWithDates, (it) => -it.date.getTime());
    const toDelete = pathsWithDates.slice(leaveLastN);
    await Promise.all(
      toDelete.map(async (it) => {
        await fsPromises.rm(it.folderPath, { recursive: true });
      })
    );
    if (toDelete.length > 0) {
      globalLogger.info(
        `Cleaned ${toDelete.length} backup folders in ${folderPath}`
      );
    }
  }

  private async createBackupInFolder(
    folder: string,
    info: ProjectInfo,
    data: Buffer
  ) {
    const newBackupFolderName = DF.format(new Date(), 'yyyy-MM-dd HH-mm-ss');
    const backupFolderPath = path.join(folder, newBackupFolderName);
    await fsPromises.mkdir(backupFolderPath);

    const currentName = info.current.fileName;
    const backupPath = path.join(backupFolderPath, currentName);

    await this.fileWatcher.writeFileSuspendWatcher(backupPath, data);

    return E.right(`Backup saved to folder "${newBackupFolderName}"`);
  }
}
