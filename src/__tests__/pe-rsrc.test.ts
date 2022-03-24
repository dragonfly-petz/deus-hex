import { pipe } from 'fp-ts/function';
import path from 'path';
import {
  getFileInfo,
  getResourceSectionData,
  parsePE,
  PE_RESOURCE_ENTRY,
  renameClothingFile,
} from '../main/app/pe-files/pe-files-util';
import { E, Either } from '../common/fp-ts/fp';
import { getTestResourcesPath } from '../common/asset-path';
import { withTempDir, withTempFile } from '../main/app/file/temp-file';
import { fsPromises } from '../main/app/util/fs-promises';
import {
  decodeFromSection,
  encodeToSection,
  ResDirTable,
} from '../common/petz/codecs/pe-rsrc';
import {
  getAllDataEntriesWithId,
  resourceEntryIdEqual,
} from '../common/petz/codecs/rsrc-utility';
import { RcData, rcDataCodec, rcDataId } from '../common/petz/codecs/rcdata';

describe('pe-rsrc', () => {
  test('read .clo file', async () => {
    const filePath = getTestResourcesPath('Nosepest.clo');
    const fileInfo = fromEither(await getFileInfo(filePath));
    const { rcData } = fileInfo.rcData;
    expect(rcData.breedId).toEqual(20836);
    expect(rcData.displayName).toEqual('Nosepest');
    expect(rcData.spriteName).toEqual('Sprite_Clot_SilNosepest');
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

      const fileInfo = fromEither(await getFileInfo(tempDestPath));
      const { rcData } = fileInfo.rcData;
      expect(rcData.breedId).toEqual(20837);
      expect(rcData.displayName).toEqual('Dragonly');
      expect(rcData.spriteName).toEqual('Sprite_Clot_Dragonflyer');
    });
  });

  test('rsrc section codec identity', async () => {
    return withTempFile(async (tmpFile) => {
      const srcFilePath = getTestResourcesPath('Nosepest.clo');
      const { resDirTable } = fromEither(await getFileInfo(srcFilePath));
      const buf = await fsPromises.readFile(srcFilePath);
      const pe = await parsePE(buf);
      const sectionData = fromEither(await getResourceSectionData(pe));

      const data = checkRcData(resDirTable, nosepestExpectedRcData);
      const rcDataReEncodedBuffer = Buffer.from(
        new Uint8Array(data.rcDataEntry.entry.data.length)
      );
      rcDataCodec.encode(data.rcData, rcDataReEncodedBuffer, 0, null);
      expect(new Uint8Array(rcDataReEncodedBuffer)).toEqual(
        data.rcDataEntry.entry.data
      );
      data.rcDataEntry.entry.data = new Uint8Array(rcDataReEncodedBuffer);

      const encodedBuffer = encodeToSection(
        sectionData.section.info,
        resDirTable
      );

      const decodedAgain = fromEither(
        decodeFromSection(sectionData.section.info, encodedBuffer)
      ).result;

      expect(decodedAgain).toEqual(resDirTable);
      const newSection = {
        ...sectionData.section,
        data: encodedBuffer,
      };
      pe.setSectionByEntry(PE_RESOURCE_ENTRY, newSection);
      const generated = pe.generate();
      await fsPromises.writeFile(tmpFile, Buffer.from(generated));

      const resDirTable2 = fromEither(await getFileInfo(tmpFile)).resDirTable;
      checkRcData(resDirTable2, nosepestExpectedRcData);
      expect(resDirTable2).toEqual(resDirTable);
    });
  });
});

function fromEither<A>(either: Either<string, A>) {
  return pipe(
    either,
    E.getOrElseW((err) => {
      throw new Error(`Expected right but got left with message: ${err}`);
    })
  );
}

const nosepestExpectedRcData: RcData = {
  unknownFlag: 1,
  spriteName: 'Sprite_Clot_SilNosepest',
  displayName: 'Nosepest',
  breedId: 20836,
  tag: 3,
};

function checkRcData(table: ResDirTable, expected: RcData) {
  const allDataEntries = getAllDataEntriesWithId(table);
  const rcDataEntry = allDataEntries.find((it) =>
    resourceEntryIdEqual(it.id, rcDataId)
  );
  expect(rcDataEntry).not.toBeUndefined();
  const rcData = fromEither(
    rcDataCodec.decode(Buffer.from(rcDataEntry!.entry.data), 0, null)
  ).result;

  expect(rcData).toEqual(expected);
  return { rcData, rcDataEntry: rcDataEntry! };
}
