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
import { directoryExists, fileExists, getPathsInDir } from '../file/file-util';
import { fsPromises } from '../util/fs-promises';
import { Result } from '../../../common/result';
import { A, E, Either } from '../../../common/fp-ts/fp';
import { isNully } from '../../../common/null';
import { resourceInfoToResult, ResourceManager } from './resource-manager';
import { taggedValue, TaggedValue } from '../../../common/tagged-value';
import { FileWatcher } from '../file/file-watcher';
import { safeLast, sortByNumeric } from '../../../common/array';
import { globalLogger } from '../../../common/logger';

const projectFolderName = 'Deus Hex Projects';

export type BackupType = 'explicit' | 'external';

const backupTypeToFolderPath: Record<BackupType, keyof ProjectFolders> = {
  explicit: 'previousVersionsFolder',
  external: 'temporaryBackupsFolder',
};

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

type ProjectFolders = ReturnType<typeof projectFolders>;

function projectFolders(id: ProjectId) {
  const folder = path.normalize(projectTypeFolder(id.type));
  const root = path.join(folder, id.name);
  const currentFolder = path.join(root, 'Current Version');
  const previousVersionsFolder = path.join(root, 'Previous Versions');
  const temporaryBackupsFolder = path.join(root, 'Temporary Backups');
  return {
    root,
    currentFolder,
    previousVersionsFolder,
    temporaryBackupsFolder,
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

interface ProjectFileInfoWithVersion extends ProjectFileInfo {
  version: number;
}

export interface ProjectInfo {
  id: ProjectId;
  current: ProjectFileInfo;
  previousVersions: ProjectFileInfoWithVersion[];
  temporaryBackups: ProjectFileInfo[];
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
    const parsedOrig = path.parse(origFileName);

    await fsPromises.copyFile(
      filePath,
      path.join(
        projectPaths.previousVersionsFolder,
        `${parsedOrig.name}_base${parsedOrig.ext}`
      )
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
          await fsPromises.mkdir(it, { recursive: true });
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

  async getProjectById(id: ProjectId): Promise<ProjectResult> {
    const projectPaths = projectFolders(id);
    const current = await this.getOneProjectFileInfo(
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

    const previousVersions = await this.getProjectFileInfosVersioned(
      id.type,
      projectPaths.previousVersionsFolder
    );
    const temporaryBackups = await this.getProjectFileInfos(
      id.type,
      projectPaths.temporaryBackupsFolder
    );

    return {
      id,
      info: E.right({
        id,
        current: current.right,
        previousVersions,
        temporaryBackups: E.isRight(temporaryBackups)
          ? temporaryBackups.right
          : [],
        projectPaths,
      }),
    };
  }

  async restoreProjectFrom(id: ProjectId, filePath: string) {
    const projectPaths = await this.getAndCreateProjectFolders(id);
    const current = await this.getOneProjectFileInfo(
      id.type,
      projectPaths.currentFolder
    );
    if (E.isLeft(current)) return current;
    const versionAndNewName = this.getVersionForFileName(filePath);
    const baseName = E.isRight(versionAndNewName)
      ? versionAndNewName.right.fileName
      : path.basename(filePath);

    await fsPromises.rm(current.right.path);
    const newCurrentFile = path.join(projectPaths.currentFolder, baseName);

    await this.fileWatcher.copyFileSuspendWatch(filePath, newCurrentFile);
    return E.right(await this.fileToEditorParams(newCurrentFile));
  }

  private async getOneProjectFileInfo(type: FileType, folder: string) {
    const res = await this.getProjectFileInfos(type, folder);
    return pipe(
      res,
      E.chain((it) => {
        if (it.length === 1) {
          return E.right(it[0]);
        }
        return E.left(`Expected to find a single file, found ${it.length}`);
      })
    );
  }

  private mkVersionedFileName(filePath: string, version: number) {
    const parsed = path.parse(filePath);
    return path.join(parsed.dir, `${parsed.name}_v${version}${parsed.ext}`);
  }

  private getVersionForFileName(filePath: string) {
    const parsed = path.parse(filePath);
    const split = parsed.name.split('_');
    const last = safeLast(split) ?? '';
    const number = parseInt(last.slice(1), 10);
    if (split.length < 2 || last[0] !== 'v' || Number.isNaN(number)) {
      return E.left("Expected a format like 'name_v1'");
    }
    const newName = split.slice(0, split.length - 1).join('_');
    return E.right({ version: number, fileName: `${newName}${parsed.ext}` });
  }

  private async getProjectFileInfosVersioned(
    type: FileType,
    folder: string
  ): Promise<ProjectFileInfoWithVersion[]> {
    const res = await this.getProjectFileInfos(type, folder);
    if (E.isLeft(res)) return [];
    const asVersion = res.right.map((info) => {
      const version = this.getVersionForFileName(info.path);
      if (E.isLeft(version)) {
        return version;
      }
      return E.right({
        ...info,
        version: version.right.version,
      });
    });
    return A.rights(asVersion);
  }

  private async getProjectFileInfos(
    type: FileType,
    folder: string
  ): Promise<Result<ProjectFileInfo[]>> {
    const paths = await getPathsInDir(folder);
    if (E.isLeft(paths)) return paths;
    const foundPaths = paths.right.filter((it) => {
      return path.extname(it) === fileTypes[type].extension;
    });
    const results = await Promise.all(
      foundPaths.map(async (filePath) => {
        const stat = await fsPromises.stat(filePath);

        const resInfo = await this.resourceManager.getResourceInfo(
          filePath,
          type
        );
        return pipe(
          resourceInfoToResult(resInfo),
          E.map((it) => {
            return {
              path: filePath,
              savedDate: stat.ctime,
              itemName: it.itemName,
              fileName: path.parse(filePath).base,
            };
          })
        );
      })
    );
    return E.right(A.rights(results));
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

  async saveBackup(
    filePath: string,
    projectId: ProjectId,
    type: BackupType,
    data: Buffer
  ) {
    const { info } = await this.getProjectById(projectId);
    if (E.isLeft(info)) {
      return info;
    }
    if (info.right.current.path !== filePath) {
      return E.left('Expected supplied path to match project current path');
    }
    const folder = info.right.projectPaths[backupTypeToFolderPath[type]];
    const res = await this.createBackupInFolder(folder, info.right, data);
    if (type === 'external') {
      await this.cleanBackups(projectId.type, folder, 3);
    }
    return res;
  }

  async exportCurrentToGame(
    petzFolder: string,
    id: ProjectId,
    overwrite: boolean
  ) {
    const projectPaths = await this.getAndCreateProjectFolders(id);
    const current = await this.getOneProjectFileInfo(
      id.type,
      projectPaths.currentFolder
    );
    if (E.isLeft(current)) {
      return current;
    }
    const petzResourceDir = path.join(
      petzFolder,
      ...fileTypes[id.type].pathSegments
    );
    const petzResourceFilePath = path.join(
      petzResourceDir,
      path.parse(current.right.path).base
    );

    const exists = await fileExists(petzResourceFilePath);
    if (E.isRight(exists) && exists.right && !overwrite) {
      return E.right({ alreadyExists: petzResourceFilePath });
    }

    await fsPromises.copyFile(current.right.path, petzResourceFilePath);
    return E.right('Successfully copied to game');
  }

  private async cleanBackups(
    type: FileType,
    folderPath: string,
    leaveLastN: number
  ) {
    const res = await this.getProjectFileInfosVersioned(type, folderPath);
    const pathsOrdered = res.slice();
    sortByNumeric(pathsOrdered, (it) => -it.version);
    const toDelete = pathsOrdered.slice(leaveLastN);
    await Promise.all(
      toDelete.map(async (it) => {
        await fsPromises.rm(it.path);
      })
    );
    if (toDelete.length > 0) {
      globalLogger.info(
        `Cleaned ${toDelete.length} temporary backup files in ${folderPath}`
      );
    }
  }

  private async createBackupInFolder(
    folder: string,
    info: ProjectInfo,
    data: Buffer
  ) {
    const versionedAlready = await this.getProjectFileInfosVersioned(
      info.id.type,
      folder
    );
    const versionNums = versionedAlready.map((it) => it.version);
    const versionToUse = Math.max(...[0, ...versionNums]) + 1;
    const backupFilePath = this.mkVersionedFileName(
      info.current.path,
      versionToUse
    );
    const backupPath = path.join(folder, path.parse(backupFilePath).base);

    await this.fileWatcher.writeFileSuspendWatcher(backupPath, data);

    return E.right(`Backup saved to path "${backupPath}"`);
  }
}
