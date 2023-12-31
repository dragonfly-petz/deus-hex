import path from 'path';
import * as PE from 'pe-library';
import { NtExecutable } from 'pe-library';
import { identity, pipe } from 'fp-ts/function';
import { NtExecutableSection } from 'pe-library/dist/NtExecutable';
import type ImageDataDirectoryArray from 'pe-library/dist/format/ImageDataDirectoryArray';
import type { ImageDirectoryEntry } from 'pe-library/dist/format';
import { globalLogger } from '../../../common/logger';
import { fsPromises } from '../util/fs-promises';
import { assertEqual } from '../../../common/assert';
import { safeLast, sortByNumeric, sumBy } from '../../../common/array';
import { E, Either } from '../../../common/fp-ts/fp';
import { PromiseInner } from '../../../common/promise';
import { isNotNully, isNully } from '../../../common/null';
import {
  decodeFromSection,
  encodeToSection,
  ResDataEntry,
  ResDirTable,
} from '../../../common/petz/codecs/pe-rsrc';
import { bytesToString, bytesToStringForDiff } from '../../../common/buffer';
import { withTempFile } from '../file/temp-file';
import {
  getResourceEntryById,
  ResourceEntryId,
} from '../../../common/petz/codecs/rsrc-utility';
import {
  RcData,
  rcDataCodec,
  rcDataId,
} from '../../../common/petz/codecs/rcdata';
import { Result } from '../../../common/result';
import { toHex } from '../../../common/number';

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

function removeSymbolsNumber(buf: Buffer) {
  const elfanewOffset = 0x3c;
  const peOffset = buf.readUInt32LE(elfanewOffset);
  const peCheck = readChars(buf, peOffset, 4);
  assertEqual(peCheck, 'PE\0\0');
  const symbolNumberOffset = peOffset + 4 + 12;
  const num = buf.readUInt32LE(symbolNumberOffset);
  buf.writeUInt32LE(0, symbolNumberOffset);
  return num;
}

export async function parsePE(buffer: Buffer) {
  // pe-library doesn't like this to exist...
  const num = removeSymbolsNumber(buffer);
  const pe = PE.NtExecutable.from(buffer);
  // however we can set it to the original value again without issues when writing
  pe.newHeader.fileHeader.numberOfSymbols = num;
  return pe;
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

// the ImageDirectoryEntry export doesn't work properly so we redefine them here
export const PE_RESOURCE_ENTRY = 2; // ImageDirectoryEntry.Resource
export const PE_RELOC_ENTRY = 5; // ImageDirectoryEntry.BaseRelocation

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

export async function getExistingBreedInfos(targetFile: string) {
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
    return getFileInfoAndData(innerPath);
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

export async function getFileInfoAndData(
  filePath: string
): Promise<Result<FileInfoAndData>> {
  const buf = await fsPromises.readFile(filePath);
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

export type FileInfoAndData = {
  pathParsed: path.ParsedPath;
  filePath: string;
  itemName: string;
} & ResourceData;

export async function getFileInfo(
  filePath: string
): Promise<Either<string, FileInfo>> {
  return pipe(
    await getFileInfoAndData(filePath),
    E.map((it) => {
      return {
        filePath: it.filePath,
        itemName: it.itemName,
        rcInfo: it.rcDataAndEntry.rcData,
      };
    })
  );
}

export interface FileInfo {
  filePath: string;
  itemName: string;
  rcInfo: RcData;
}

export interface ResourceDataAndEntry {
  rcData: RcData;
  rcDataEntry: ResDataEntry;
}

function getRcDataAndEntry(table: ResDirTable): Result<ResourceDataAndEntry> {
  return pipe(
    getResourceEntryById(table, rcDataId),
    E.fromNullable('No rcData found'),
    E.chain((res) => {
      return pipe(
        rcDataCodec.decode(Buffer.from(res.entry.data), 0, null),
        E.map((it) => {
          return {
            rcData: it.result,
            rcDataEntry: res.entry,
          };
        })
      );
    })
  );
}

export interface ResourceData {
  rcDataAndEntry: ResourceDataAndEntry;
  resDirTable: ResDirTable;
}

export function getResourceData(pe: PE.NtExecutable): Result<ResourceData> {
  return pipe(
    getResourceSectionData(pe),
    E.chain((res) => {
      return decodeFromSection(res.section.info, res.sectionData);
    }),
    E.chain((resDirTable) => {
      return pipe(
        getRcDataAndEntry(resDirTable.result),
        E.map((res) => ({
          rcDataAndEntry: res,
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
            new Uint8Array(resData.rcDataAndEntry.rcDataEntry.data.length)
          );
          const newRcData = {
            ...resData.rcDataAndEntry.rcData,
            breedId,
          };
          rcDataCodec.encode(newRcData, rcDataReEncodedBuffer, 0, null);
          resData.rcDataAndEntry.rcDataEntry.data = new Uint8Array(
            rcDataReEncodedBuffer
          );
          const encodedBuffer = encodeToSection(
            sectionData.section.info,
            resData.resDirTable
          );

          peSetSectionByEntry(
            pe,
            PE_RESOURCE_ENTRY,
            sectionData.section,
            encodedBuffer
          );
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
      const itemName = res.rcDataAndEntry.rcData.spriteName.split('_').pop()!;
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
      .map((it) => it.right.rcDataAndEntry.rcData.breedId);
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

export interface SectionWithId {
  id: ResourceEntryId;
  data: Uint8Array;
}

export async function getFileAndUpdateResourceSections(
  filePath: string,
  sections: Array<SectionWithId>
) {
  const buf = await fsPromises.readFile(filePath);
  const codecRes = pipe(
    await getFileInfoAndData(filePath),
    E.map((it) => it.resDirTable),
    E.getOrElseW(() => {
      throw new Error('Expected right');
    })
  );
  for (const section of sections) {
    const dataEntry = getResourceEntryById(codecRes, section.id);
    if (isNully(dataEntry)) {
      throw new Error(
        `No data entry found for id ${JSON.stringify(section.id)}`
      );
    }
    dataEntry.entry.data = section.data;
  }
  const pe = await parsePE(buf);
  const sectionData = pipe(
    await getResourceSectionData(pe),
    E.getOrElseW(() => {
      throw new Error('Expected right');
    })
  );
  const encodedBuffer = encodeToSection(sectionData.section.info, codecRes);

  peSetSectionByEntry(
    pe,
    PE_RESOURCE_ENTRY,
    sectionData.section,
    encodedBuffer
  );
  const generated = pe.generate();
  return Buffer.from(generated);
}

export function peSetSectionByEntry(
  pe: NtExecutable,
  imgDir: ImageDirectoryEntry,
  section: Readonly<NtExecutableSection>,
  buffer: Buffer
) {
  // for some reason the original files often (always?) have a mismatch between the size of the reloc section
  // in the optional data directory, and the size in the section header.
  // pe-library overwrites the optional data directory entry with the section header info, but doing this
  // makes the file unloadable in game. It seems that the specification for PE requires the
  // optional data directory size to be correct, but not the size given in the section header
  // so this breaks the file
  // we therefore restore the value in the optional header after writing a section
  const imageOptHeader = (pe as any)._dda as ImageDataDirectoryArray;
  const originalEntry = imageOptHeader.get(PE_RELOC_ENTRY);
  // make sure the virtual size is set correctly
  const newSection = {
    info: {
      ...section.info,
      virtualSize: buffer.length,
    },
    data: buffer,
  };
  pe.setSectionByEntry(imgDir, newSection);
  if (isNotNully(originalEntry)) {
    const newEntry = imageOptHeader.get(PE_RELOC_ENTRY);
    if (isNully(newEntry)) {
      throw new Error('Expected to find base relocation entry');
    }
    imageOptHeader.set(PE_RELOC_ENTRY, {
      ...newEntry,
      size: originalEntry.size,
    });
  }
}

export type RenameClothingFileResult = PromiseInner<
  ReturnType<typeof renameClothingFile>
>;

export function dumpBinary(buff: Buffer) {
  const arr = Uint8Array.from(buff);
  const chunkSize = 32;
  const chunks = new Array<string>();
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = Array.from(arr.slice(i, i + chunkSize));
    chunks.push(chunk.map((it) => it.toString(16).padStart(2, '0')).join(' '));
    chunks.push(bytesToStringForDiff(chunk));
  }
  return chunks.join(`\n`);
}
