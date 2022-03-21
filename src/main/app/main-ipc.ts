import { app, ipcMain } from 'electron';
import { pipe } from 'fp-ts/function';
import * as fs from 'fs';
import * as PE from 'pe-library';
import {
  IpcCallMessage,
  IpcReplyMessage,
  mainIpcChannel,
} from '../../common/ipc';
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
import { getClothingFileInfo } from '../../common/petz/files/clothing';
import { isNully } from '../../common/null';
import { getDebugTestResourcesPath } from './asset-path';

export class MainIpc {
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
    return getClothingFileInfo(file);
  }

  async debugParseClo() {
    const path = getDebugTestResourcesPath('Nosepest.clo');
    const data = fs.readFileSync(path);
    const exe = PE.NtExecutable.from(data);
    return JSON.stringify(exe);
  }
}

export function connectIpc<A>(target: A) {
  ipcMain.on(mainIpcChannel, async (event, arg: IpcCallMessage) => {
    const targetAsAny = target as any;
    if (isNully(targetAsAny[arg.funcName])) {
      throw new Error(`Ipc target had no property named ${arg.funcName}`);
    }
    if (typeof targetAsAny[arg.funcName] !== 'function') {
      throw new Error(`Ipc target ${arg.funcName} is not a function`);
    }
    const res = await targetAsAny[arg.funcName](...arg.args);
    const message: IpcReplyMessage = {
      id: arg.id,
      result: res,
    };
    event.reply(mainIpcChannel, message);
  });
}
