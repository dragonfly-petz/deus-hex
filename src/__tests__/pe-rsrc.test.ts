import path from 'path';
import {
  getFileInfoAndData,
  getResourceSectionData,
  parsePE,
  PE_RESOURCE_ENTRY,
  removeSymbolsNumber,
  renameClothingFile,
} from '../main/app/pe-files/pe-files-util';
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
import { throwFromEither } from '../common/fp-ts/either';
import { initGlobalLogger } from '../common/logger';

initGlobalLogger('test');
describe('pe-rsrc', () => {
  test('read .clo file', async () => {
    const filePath = getTestResourcesPath('Nosepest.clo');
    const fileInfo = throwFromEither(await getFileInfoAndData(filePath));
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

      const fileInfo = throwFromEither(await getFileInfoAndData(tempDestPath));
      const { rcData } = fileInfo.rcData;
      expect(rcData.breedId).toEqual(20837);
      expect(rcData.displayName).toEqual('Dragonly');
      expect(rcData.spriteName).toEqual('Sprite_Clot_Dragonflyer');
    });
  });

  test('rsrc section codec identity', async () => {
    await testCodecIdentityWithFile('Nosepest.clo', nosepestExpectedRcData);
    await testCodecIdentityWithFile(
      'Vampyre Collar_Black P4.clo',
      vampyreExpectedRcData
    );
  });
});

function testCodecIdentityWithFile(fileName: string, expected: RcData) {
  return withTempFile(async (tmpFile) => {
    const srcFilePath = getTestResourcesPath(fileName);
    const { resDirTable } = throwFromEither(
      await getFileInfoAndData(srcFilePath)
    );
    const buf = await fsPromises.readFile(srcFilePath);
    removeSymbolsNumber(buf);
    const pe = await parsePE(buf);
    const sectionData = throwFromEither(await getResourceSectionData(pe));

    const data = checkRcData(resDirTable, expected);
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
    expect(encodedBuffer.length).toBeLessThanOrEqual(
      sectionData.sectionData.length
    );

    const decodedAgain = throwFromEither(
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

    const resDirTable2 = throwFromEither(
      await getFileInfoAndData(tmpFile)
    ).resDirTable;
    checkRcData(resDirTable2, expected);
    expect(resDirTable2).toEqual(resDirTable);
  });
}

const nosepestExpectedRcData: RcData = {
  unknownFlag: 1,
  spriteName: 'Sprite_Clot_SilNosepest',
  displayName: 'Nosepest',
  breedId: 20836,
  tag: 3,
};

const vampyreExpectedRcData: RcData = {
  unknownFlag: 1,
  spriteName: 'Sprite_Clot_BadgeSheriff',
  displayName: 'Sheriff Badge',
  breedId: 15123,
  tag: 3,
};

function checkRcData(table: ResDirTable, expected: RcData) {
  const allDataEntries = getAllDataEntriesWithId(table);
  const rcDataEntry = allDataEntries.find((it) =>
    resourceEntryIdEqual(it.id, rcDataId)
  );
  expect(rcDataEntry).not.toBeUndefined();
  const rcData = throwFromEither(
    rcDataCodec.decode(Buffer.from(rcDataEntry!.entry.data), 0, null)
  ).result;

  expect(rcData).toEqual(expected);
  return { rcData, rcDataEntry: rcDataEntry! };
}
