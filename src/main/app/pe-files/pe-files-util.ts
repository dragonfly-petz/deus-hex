import path from 'path';
import * as PE from 'pe-library';
import { identity, pipe } from 'fp-ts/function';
import { globalLogger } from '../../../common/logger';
import { fsPromises } from '../util/fs-promises';
import { assertEqual } from '../../../common/assert';
import { safeLast, sortByNumeric, sumBy } from '../../../common/array';
import { E } from '../../../common/fp-ts/fp';
import { PromiseInner } from '../../../common/promise';
import { isNotNully, isNully } from '../../../common/null';
import {
  decodeFromSection,
  encodeToSection,
  ResDirTable,
} from '../../../common/petz/codecs/pe-rsrc';
import { bytesToString } from '../../../common/buffer';
import { withTempFile } from '../file/temp-file';
import {
  getDataEntryById,
  ResourceEntryId,
} from '../../../common/petz/codecs/rsrc-utility';
import { rcDataCodec, rcDataId } from '../../../common/petz/codecs/rcdata';

function toHexString(arr: Uint8Array) {
  return Array.from(arr)
    .map((it) => {
      return it.toString(16).padStart(2, '0');
    })
    .join(' ');
}

function readChars(buf: Buffer, offset: number, length: number) {
  const strings = new Array<string>();
  for (let i = offset; i < offset + length; i++) {
    strings.push(String.fromCharCode(buf[i]));
  }
  return strings.join('');
}

function readNullTerminatedString(buf: Buffer, offset: number) {
  const strings = new Array<string>();
  for (let i = offset; i < buf.length; i++) {
    if (buf[i] === 0) break;
    strings.push(String.fromCharCode(buf[i]));
  }
  return strings.join('');
}

function toHex(val: number, pad = 8) {
  return `0x${val.toString(16).padStart(pad, '0')}`;
}

function removeSymbolsNumber(buf: Buffer) {
  const elfanewOffset = 0x3c;
  const peOffset = buf.readUInt32LE(elfanewOffset);
  const peCheck = readChars(buf, peOffset, 4);
  assertEqual(peCheck, 'PE\0\0');
  const symbolNumberOffset = peOffset + 4 + 12;
  const symbolNumber = buf.readUInt32LE(symbolNumberOffset);
  globalLogger.info(
    `Replacing symbol number ${symbolNumber} (${toHex(
      symbolNumber
    )}) with 0 at offset ${toHex(symbolNumberOffset)}`
  );
  buf.writeUInt32LE(0, symbolNumberOffset);
}

export async function parsePE(buffer: Buffer) {
  return PE.NtExecutable.from(buffer);
}

function stringToAsciiUint8(str: string) {
  return new Uint8Array(
    str.split('').map((it) => {
      return it.charCodeAt(0);
    })
  );
}

function stringToLengthUnicodeUint8(str: string) {
  const toAscii = stringToAsciiUint8(str);
  const out = new Uint8Array(toAscii.length * 2);
  for (const [idx, val] of toAscii.entries()) {
    out[idx * 2] = val;
  }
  return out;
}

function renameInBuffer(buf: Buffer, from: Uint8Array, to: Uint8Array) {
  assertEqual(
    from.length,
    to.length,
    'rename from and to should have same length'
  );
  const offsets = new Array<number>();
  let lastOffset = buf.indexOf(from, 0);
  globalLogger.info(`searching for ${toHexString(from)}`);

  while (lastOffset > -1) {
    globalLogger.info(`Replacing val at offset ${toHex(lastOffset)}`);
    offsets.push(lastOffset);
    buf.set(to, lastOffset);
    lastOffset = buf.indexOf(from, lastOffset + to.length);
  }
  return { offsets, from, to };
}

type RenameResultBytes = ReturnType<typeof renameInBuffer>;

function toStringResult(newRe: RenameResultBytes) {
  return {
    offsets: newRe.offsets.map((it) => toHex(it)),
    from: bytesToString(newRe.from),
    to: bytesToString(newRe.to),
  };
}

export const PE_RESOURCE_ENTRY = 2;

export function getResourceSectionData(pe: PE.NtExecutable) {
  const section = pe.getSectionByEntry(PE_RESOURCE_ENTRY);
  if (isNully(section)) {
    return E.left('Could not find resource section');
  }
  const sectionData = section.data;
  if (isNully(sectionData)) {
    return E.left('Could not find resource section data');
  }
  return E.right({
    sectionData: Buffer.from(sectionData),
    section,
  });
}

async function getExistingBreedInfos(targetFile: string) {
  const dir = path.dirname(targetFile);
  const files = await fsPromises.readdir(dir);
  globalLogger.info(`Processing ${files.length} files`);
  const targetExt = path.extname(targetFile);
  const promises = files.map(async (it) => {
    const innerPath = path.join(dir, it);
    const stat = await fsPromises.stat(innerPath);
    if (stat.isDirectory()) {
      globalLogger.info(
        `Skipping ${it} - recursion into sub directories is not supported`
      );
      return null;
    }
    const ext = path.extname(it);
    if (ext !== targetExt) {
      globalLogger.info(`Skipping ${it}, did not match extension ${targetExt}`);
      return null;
    }
    return getFileInfo(innerPath);
  });
  let promisesFinished = 0;
  promises.map(async (it) => {
    await it;
    promisesFinished++;
    globalLogger.info(
      `${promisesFinished} out of ${promises.length} files processed `
    );
  });
  const res = await Promise.all(promises);
  return res.filter(isNotNully);
}

export async function getFileInfo(filePath: string) {
  const buf = await fsPromises.readFile(filePath);

  removeSymbolsNumber(buf);
  return pipe(
    await getResourceFileInfo(buf),
    E.mapLeft((it) => {
      return `Error when getting info for ${filePath}: ${it}`;
    }),
    E.map((it) => {
      return { ...it, filePath, pathParsed: path.parse(filePath) };
    })
  );
}

export type FileInfo = PromiseInner<ReturnType<typeof getFileInfo>>;

function getRcData(table: ResDirTable) {
  return pipe(
    getDataEntryById(table, rcDataId),
    E.fromNullable('No rcData found'),
    E.chain((res) => {
      return pipe(
        rcDataCodec.decode(Buffer.from(res.data), 0, null),
        E.map((it) => {
          return {
            rcData: it.result,
            rcDataEntry: res,
          };
        })
      );
    })
  );
}

export function getResourceData(pe: PE.NtExecutable) {
  return pipe(
    getResourceSectionData(pe),
    E.chain((res) => {
      return decodeFromSection(res.section.info, res.sectionData);
    }),
    E.chain((resDirTable) => {
      return pipe(
        getRcData(resDirTable.result),
        E.map((res) => ({
          rcData: res,
          resDirTable: resDirTable.result,
        }))
      );
    })
  );
}

export async function setBreedId(pe: PE.NtExecutable, breedId: number) {
  return pipe(
    getResourceSectionData(pe),
    E.map((sectionData) => {
      return pipe(
        getResourceData(pe),
        E.map((resData) => {
          const rcDataReEncodedBuffer = Buffer.from(
            new Uint8Array(resData.rcData.rcDataEntry.data.length)
          );
          const newRcData = {
            ...resData.rcData.rcData,
            breedId,
          };
          rcDataCodec.encode(newRcData, rcDataReEncodedBuffer, 0, null);
          resData.rcData.rcDataEntry.data = new Uint8Array(
            rcDataReEncodedBuffer
          );
          const encodedBuffer = encodeToSection(
            sectionData.section.info,
            resData.resDirTable
          );
          const newSection = {
            ...sectionData.section,
            data: encodedBuffer,
          };
          pe.setSectionByEntry(PE_RESOURCE_ENTRY, newSection);
          return true;
        })
      );
    })
  );
}

export async function getResourceFileInfo(buffer: Buffer) {
  const pe = await parsePE(buffer);
  return pipe(
    getResourceData(pe),
    E.map((res) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const itemName = res.rcData.rcData.spriteName.split('_').pop()!;
      return {
        ...res,
        itemName,
      };
    })
  );
}

export async function renameClothingFile(
  filePath: string,
  toFileName: string,
  fromInternal: string,
  toInternal: string
) {
  return withTempFile(async (tempPath) => {
    await fsPromises.copyFile(filePath, tempPath);
    const buf = await fsPromises.readFile(tempPath);
    const fromFileName = path.parse(filePath).name;
    removeSymbolsNumber(buf);

    const offsetsChanged = Array<RenameResultBytes>();
    offsetsChanged.push(
      renameInBuffer(
        buf,
        stringToAsciiUint8(fromInternal),
        stringToAsciiUint8(toInternal)
      )
    );

    offsetsChanged.push(
      renameInBuffer(
        buf,
        stringToLengthUnicodeUint8(fromInternal),
        stringToLengthUnicodeUint8(toInternal)
      )
    );

    offsetsChanged.push(
      renameInBuffer(
        buf,
        stringToLengthUnicodeUint8(fromInternal.toUpperCase()),
        stringToLengthUnicodeUint8(toInternal.toUpperCase())
      )
    );
    offsetsChanged.push(
      renameInBuffer(
        buf,
        stringToLengthUnicodeUint8(fromFileName),
        stringToLengthUnicodeUint8(toFileName)
      )
    );
    offsetsChanged.push(
      renameInBuffer(
        buf,
        stringToAsciiUint8(fromFileName),
        stringToAsciiUint8(toFileName)
      )
    );
    const totalChanges = sumBy(offsetsChanged, (it) => it.offsets.length);
    if (totalChanges < 1) {
      return E.left('No changes were made in the file');
    }

    await fsPromises.writeFile(tempPath, buf);
    const existingInfos = await getExistingBreedInfos(filePath);
    const warnIdFailed = existingInfos.filter(E.isLeft).map((it) => it.left);
    const existingBreedIds = existingInfos
      .filter(E.isRight)
      .map((it) => it.right.rcData.rcData.breedId);
    sortByNumeric(existingBreedIds, identity);
    const highest = safeLast(existingBreedIds) ?? 20000;
    const newId = highest + 1;
    globalLogger.info(`Highest id found was ${highest}, using ${newId}`);
    const pe = await parsePE(buf);
    await setBreedId(pe, newId);
    const dirToWriteTo = path.join(path.dirname(filePath));
    const parsed = path.parse(filePath);
    const newFilePath = path.join(dirToWriteTo, `${toFileName}${parsed.ext}`);
    const generated = pe.generate();
    globalLogger.info(`Writing transformed file to ${newFilePath}`);
    await fsPromises.writeFile(newFilePath, Buffer.from(generated));
    return E.right({
      warnIdFailed,
      newId,
      newFilePath,
      changes: offsetsChanged.map(toStringResult),
    });
  });
}

export async function updateResourceSection(
  filepath: string,
  id: ResourceEntryId,
  data: Uint8Array
) {
  const buf = await fsPromises.readFile(filepath);
  const codecRes = pipe(
    await getFileInfo(filepath),
    E.map((it) => it.resDirTable),
    E.getOrElseW(() => {
      throw new Error('Expected right');
    })
  );
  const dataEntry = getDataEntryById(codecRes, id);
  if (isNully(dataEntry)) {
    throw new Error(`No data entry found for id ${JSON.stringify(id)}`);
  }
  dataEntry.data = data;
  const pe = await parsePE(buf);
  const sectionData = pipe(
    await getResourceSectionData(pe),
    E.getOrElseW(() => {
      throw new Error('Expected right');
    })
  );
  const encodedBuffer = encodeToSection(sectionData.section.info, codecRes);

  const newSection = {
    ...sectionData.section,
    data: encodedBuffer,
  };
  pe.setSectionByEntry(PE_RESOURCE_ENTRY, newSection);
  const generated = pe.generate();
  await fsPromises.writeFile(filepath, Buffer.from(generated));
}

export type RenameClothingFileResult = PromiseInner<
  ReturnType<typeof renameClothingFile>
>;
