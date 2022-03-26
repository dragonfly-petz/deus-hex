import { app, ipcMain } from 'electron';
import { pipe } from 'fp-ts/function';
import {
  parseAddBallsBreed,
  serializeClothingAddBalls,
} from '../../common/petz/parser/addballs';
import { E, Either } from '../../common/fp-ts/fp';
import {
  transformBreedAddBallsToClothing,
  transformBreedLinesToClothing,
} from '../../common/petz/transform/transforms';
import { parseLines, serializeLines } from '../../common/petz/parser/lines';
import { isDev } from './util';
import {
  getFileInfo,
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

export interface ResourcesInfo {}

export class MainIpcBase {
  constructor(private userSettingsRemote: RemoteObject<UserSettings>) {}

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

  async getClothingFileInfo(file: string) {
    return getFileInfo(file);
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
    this.userSettingsRemote.setRemote(us);
  }

  async getUserSettings() {
    return this.userSettingsRemote.getValue();
  }

  async getResourcesInfo() {
    return E.left('Not found') as Either<string, ResourcesInfo>;
  }
}

export type MainIpc = WrapWithCaughtError<MainIpcBase>;

export function mkAndConnectMainIpc(
  userSettingsRemote: RemoteObject<UserSettings>
) {
  const mainIpc = new MainIpcBase(userSettingsRemote);
  connectIpc(mainIpc, mainIpcChannel, {
    tag: 'main',
    on: ipcMain.on.bind(ipcMain),
  });
}
