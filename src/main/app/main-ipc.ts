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
  getFileInfoAndData,
  renameClothingFile,
  updateResourceSection,
} from './pe-files/pe-files-util';
import { ResourceEntryId } from '../../common/petz/codecs/rsrc-utility';
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

export class MainIpcBase {
  private readonly resourceManager: ResourceManager;

  private readonly projectManager: ProjectManager;

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

  async updateResourceSection(
    filepath: string,
    id: ResourceEntryId,
    data: Uint8Array
  ) {
    return updateResourceSection(filepath, id, data);
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
