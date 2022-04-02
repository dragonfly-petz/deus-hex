import { app, ipcMain, shell } from 'electron';
import { pipe } from 'fp-ts/function';
import {
  parseAddBallsBreed,
  serializeClothingAddBalls,
} from '../../common/petz/parser/addballs';
import { E } from '../../common/fp-ts/fp';
import {
  transformBreedAddBallsToClothing,
  transformBreedLinesToClothing,
} from '../../common/petz/transform/transforms';
import { parseLines, serializeLines } from '../../common/petz/parser/lines';
import { isDev } from './util';
import {
  getFileAndUpdateResourceSections,
  getFileInfoAndData,
  renameClothingFile,
  SectionWithId,
} from './pe-files/pe-files-util';
import {
  connectIpc,
  mainIpcChannel,
  WrapWithCaughtError,
} from '../../common/ipc';
import { UserSettings } from './persisted/user-settings';
import { RemoteObject } from '../../common/reactive/remote-object';
import { ResourceManager } from './resource/resource-manager';
import { FileType } from '../../common/petz/file-types';
import { isNully } from '../../common/null';
import {
  getProjectManagerFolders,
  ProjectManager,
} from './resource/project-manager';
import { createWindow, DomIpcHolder } from './create-window';
import { uuidV4 } from '../../common/uuid';
import { Disposer } from '../../common/disposable';
import { watchPathForChange } from './file/file-util';
import { globalLogger } from '../../common/logger';

export interface SaveResourceChangesOptions {
  backup: boolean;
}

export class MainIpcBase {
  private readonly resourceManager: ResourceManager;

  private readonly projectManager: ProjectManager;

  private readonly fileWatchers = new Map<string, Disposer>();

  constructor(
    private userSettingsRemote: RemoteObject<UserSettings>,
    private domIpcHolder: DomIpcHolder
  ) {
    this.resourceManager = new ResourceManager();
    this.projectManager = new ProjectManager(this.resourceManager);
  }

  async getAppVersion() {
    return app.getVersion();
  }

  async isDev() {
    return isDev();
  }

  async breedAddBallsToClothing(text: string) {
    return pipe(
      parseAddBallsBreed(text),
      E.map(transformBreedAddBallsToClothing),
      E.map(serializeClothingAddBalls)
    );
  }

  async breedLinesToClothing(text: string) {
    return pipe(
      parseLines(text),
      E.map(transformBreedLinesToClothing),
      E.map(serializeLines)
    );
  }

  async getFileInfoAndData(file: string) {
    return getFileInfoAndData(file);
  }

  async renameClothingFile(
    filePath: string,
    toFileName: string,
    fromInternal: string,
    toInternal: string
  ) {
    return renameClothingFile(filePath, toFileName, fromInternal, toInternal);
  }

  async saveResourceSections(
    filePath: string,
    sections: Array<SectionWithId>,
    options?: SaveResourceChangesOptions
  ) {
    const fileInfo = await this.projectManager.fileToEditorParams(filePath);
    if (fileInfo.tag === 'invalid') {
      return E.left(fileInfo.value.message);
    }

    const buff = await getFileAndUpdateResourceSections(filePath, sections);
    const { projectId } = fileInfo.value;
    if (projectId) {
      const saveBackup = options?.backup ?? false;
      if (saveBackup) {
        return this.projectManager.saveBackup(filePath, projectId, buff);
      }
      return this.projectManager.save(filePath, projectId, buff);
    }
    return this.resourceManager.saveWithBackup(filePath, buff);
  }

  async setUserSettings(us: UserSettings) {
    return this.userSettingsRemote.setRemote(us);
  }

  async getUserSettings() {
    return this.userSettingsRemote.getValue();
  }

  async getProjectManagerFolders() {
    return getProjectManagerFolders();
  }

  async getResourcesInfo() {
    return this.resourceManager.getResourcesInfo(
      this.userSettingsRemote.getValue().petzFolder
    );
  }

  async getProjects() {
    return this.projectManager.getProjects();
  }

  async createProjectFromFile(filePath: string, name: string) {
    return this.projectManager.createProjectFromFile(filePath, name);
  }

  async fixDuplicateIds(type: FileType) {
    const { petzFolder } = this.userSettingsRemote.getValue();
    if (isNully(petzFolder)) {
      return E.left('No petz folder set');
    }
    return this.resourceManager.fixDuplicateIds(petzFolder, type);
  }

  async openDirInExplorer(directoryPath: string) {
    const errString = await shell.openPath(directoryPath);
    if (errString !== '') {
      return E.left(errString);
    }
    return E.right(true as const);
  }

  async openEditor(file: string) {
    return createWindow(this.domIpcHolder, this.userSettingsRemote, {
      editorTarget: file,
    });
  }

  async fileToEditorParams(file: string) {
    return this.projectManager.fileToEditorParams(file);
  }

  async watchFile(file: string, windowId: number) {
    const id = uuidV4();
    const { run, stop } = watchPathForChange(file, () => {
      const ipc = this.domIpcHolder.getDomIpc(windowId);
      if (isNully(ipc)) {
        globalLogger.warn(
          `Expected to find window ${windowId} when handling file watch change`
        );
        return;
      }
      ipc.onFileWatchChange({ watcherId: id, filePath: file });
    });
    this.fileWatchers.set(id, stop);
    run();
    return id;
  }

  async disposeWatchFile(watcherId: string) {
    const watcher = this.fileWatchers.get(watcherId);
    if (isNully(watcher)) {
      globalLogger.warn(
        `Expected to find watcher for id  ${watcherId} when disposing watch file`
      );
      return;
    }
    watcher();
    this.fileWatchers.delete(watcherId);
  }
}

export type MainIpc = WrapWithCaughtError<MainIpcBase>;

export function mkAndConnectMainIpc(
  userSettingsRemote: RemoteObject<UserSettings>,
  domIpcHolder: DomIpcHolder
) {
  const mainIpc = new MainIpcBase(userSettingsRemote, domIpcHolder);
  connectIpc(mainIpc, mainIpcChannel, {
    tag: 'main',
    on: ipcMain.on.bind(ipcMain),
  });
}
