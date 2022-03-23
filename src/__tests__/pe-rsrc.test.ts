import { pipe } from 'fp-ts/function';
import path from 'path';
import {
  getFileInfo,
  renameClothingFile,
} from '../main/app/pe-files/pe-files-util';
import { E } from '../common/fp-ts/fp';
import { getTestResourcesPath } from '../common/asset-path';
import { withTempDir } from '../main/app/file/temp-file';
import { fsPromises } from '../main/app/util/fs-promises';

describe('pe-rsrc', () => {
  test('read .clo file', async () => {
    const filePath = getTestResourcesPath('Nosepest.clo');
    const fileInfoRes = await getFileInfo(filePath);
    expect(E.isRight(fileInfoRes)).toEqual(true);
    const fileInfo = pipe(
      fileInfoRes,
      E.getOrElseW(() => {
        throw new Error('Expected right');
      })
    );
    expect(fileInfo.breedId).toEqual(20836);
    expect(fileInfo.displayName).toEqual('Nosepest');
    expect(fileInfo.spriteName).toEqual('Sprite_Clot_SilNosepest');
  });

  test('clothing rename', async () => {
    return withTempDir(async (tempDir) => {
      const fromName = 'Nosepest.clo';
      const toName = 'Dragonly.clo';
      const filePath = getTestResourcesPath(fromName);
      const tempSrcPath = path.join(tempDir, fromName);
      await fsPromises.copyFile(filePath, tempSrcPath);

      await renameClothingFile(
        tempSrcPath,
        'Dragonly',
        'SilNosepest',
        'Dragonflyer'
      );
      const tempDestPath = path.join(tempDir, toName);
      const res = await getFileInfo(tempDestPath);
      expect(E.isRight(res)).toEqual(true);
      const fileInfo = pipe(
        res,
        E.getOrElseW(() => {
          throw new Error('Expected right');
        })
      );
      expect(fileInfo.breedId).toEqual(20837);
      expect(fileInfo.displayName).toEqual('Dragonly');
      expect(fileInfo.spriteName).toEqual('Sprite_Clot_Dragonflyer');
    });
  });
});
