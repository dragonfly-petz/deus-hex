import { pipe } from 'fp-ts/function';
import path from 'path';
import {
  getFileInfo,
  getResourceSectionData,
  parsePE,
  PE_RESOURCE_ENTRY,
  renameClothingFile,
} from '../main/app/pe-files/pe-files-util';
import { E } from '../common/fp-ts/fp';
import { getTestResourcesPath } from '../common/asset-path';
import { withTempDir, withTempFile } from '../main/app/file/temp-file';
import { fsPromises } from '../main/app/util/fs-promises';
import {
  decodeFromSection,
  encodeToSection,
} from '../common/petz/codecs/pe-rsrc';

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

  test('rsrc section codec identity', async () => {
    return withTempFile(async (tmpFile) => {
      const srcFilePath = getTestResourcesPath('Nosepest.clo');
      const codecRes = pipe(
        await getFileInfo(srcFilePath),
        E.map((it) => it.codecRes),
        E.getOrElseW(() => {
          throw new Error('Expected right');
        })
      );
      const buf = await fsPromises.readFile(srcFilePath);
      const pe = await parsePE(buf);
      const sectionData = pipe(
        await getResourceSectionData(pe),
        E.getOrElseW(() => {
          throw new Error('Expected right');
        })
      );

      const encodedBuffer = encodeToSection(sectionData.section.info, codecRes);

      const decodedAgain = pipe(
        decodeFromSection(sectionData.section.info, encodedBuffer),
        E.map((it) => it.result),
        E.getOrElseW((e) => {
          throw new Error(`Expected right, got: ${e}`);
        })
      );

      expect(decodedAgain).toEqual(codecRes);
      const newSection = {
        ...sectionData.section,
        data: encodedBuffer,
      };
      pe.setSectionByEntry(PE_RESOURCE_ENTRY, newSection);
      const generated = pe.generate();
      await fsPromises.writeFile(tmpFile, Buffer.from(generated));
      const codecRes2 = pipe(
        await getFileInfo(tmpFile),
        E.map((it) => it.codecRes),
        E.getOrElseW(() => {
          throw new Error('Expected right');
        })
      );
      expect(codecRes2).toEqual(codecRes);
    });
  });
});
