import { app } from 'electron';
import path from 'path';
import * as PE from 'pe-library';
import { identity, pipe } from 'fp-ts/function';
import { uuidV4 } from '../../../common/uuid';
import { globalLogger } from '../../../common/logger';
import { fsPromises } from '../util/fs-promises';
import { run } from '../../../common/function';
import { isDev } from '../util';
import { getRepoRootPath } from '../asset-path';
import { assertEqual } from '../../../common/assert';
import { safeLast, sortByNumeric, sumBy } from '../../../common/array';
import { E } from '../../../common/fp-ts/fp';
import { PromiseInner } from '../../../common/promise';
import { isNotNully, isNully } from '../../../common/null';

export async function withTempFile<A>(block: (filePath: string) => Promise<A>) {
  const tmpPath = await run(async () => {
    if (isDev()) {
      await fsPromises.mkdir(getRepoRootPath('tmp'), { recursive: true });
      // starting with a "." stops electronmon from relaunching
      return getRepoRootPath('tmp', '.devTempFile');
    }
    const tempDir = app.getPath('temp');
    const tempFileName = uuidV4();
    return path.join(tempDir, tempFileName);
  });

  globalLogger.info(`Using temp file at ${tmpPath}`);
  const res = await block(tmpPath);
  await fsPromises.rm(tmpPath);
  return res;
}

function _debugBuffer(buf: Buffer, offset: number, length: number) {
  const strings = new Array<string>();
  const bytes = new Array<number>();
  for (let i = offset; i < offset + length; i++) {
    bytes.push(buf[i]);
    strings.push(buf[i].toString(16));
  }
  globalLogger.info(strings.join(' '));
  globalLogger.info(bytesToString(bytes));
}

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

async function parsePE(buffer: Buffer) {
  return PE.NtExecutable.from(buffer);
}

function stringToAsciiUint8(str: string) {
  return new Uint8Array(
    str.split('').map((it) => {
      return it.charCodeAt(0);
    })
  );
}

function bytesToString(bytes: ArrayLike<number>) {
  return Array.from(bytes)
    .map((it) => {
      return String.fromCharCode(it);
    })
    .join('');
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

const RESOURCE_ENTRY = 2;

function toArrayBuffer(buf: Buffer) {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; i++) {
    view[i] = buf[i];
  }
  return ab;
}

export async function getResourceSectionData(pe: PE.NtExecutable) {
  const section = pe.getSectionByEntry(RESOURCE_ENTRY);
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

export async function getBreedInfoOffsets(pe: PE.NtExecutable) {
  return pipe(
    await getResourceSectionData(pe),
    E.chain(({ sectionData, section }) => {
      const spriteOffset = sectionData.indexOf(stringToAsciiUint8('Sprite_'));
      if (spriteOffset < 0) {
        return E.left("Couldn't find offset for Sprite_");
      }
      const mainSpriteNameOffset = spriteOffset;
      const spriteNameLength = 0x20;
      const displayNameOffset = spriteOffset + spriteNameLength;
      const displayNameLength = 0x20;
      const breedIdOffset = spriteOffset + spriteNameLength + displayNameLength;
      return E.right({
        section,
        sectionData,
        mainSpriteNameOffset,
        displayNameOffset,
        breedIdOffset,
      });
    })
  );
}

async function getExistingBreedInfos(targetFile: string) {
  const dir = path.dirname(targetFile);
  const files = await fsPromises.readdir(dir);
  const promises = files.map(async (it) => {
    const innerPath = path.join(dir, it);
    const stat = await fsPromises.stat(innerPath);
    if (stat.isDirectory()) return null;
    return getFileInfo(innerPath);
  });
  const res = await Promise.all(promises);
  return res.filter(isNotNully);
}

export async function getFileInfo(filePath: string) {
  const buf = await fsPromises.readFile(filePath);

  removeSymbolsNumber(buf);
  return pipe(
    await getResourceFileInfo(buf),
    E.map((it) => {
      return { ...it, filePath, pathParsed: path.parse(filePath) };
    })
  );
}

export type FileInfo = PromiseInner<ReturnType<typeof getFileInfo>>;

export async function setBreedId(pe: PE.NtExecutable, breedId: number) {
  return pipe(
    await getBreedInfoOffsets(pe),
    E.map((res) => {
      res.sectionData.writeUInt32LE(breedId, res.breedIdOffset);
      const newSection = {
        ...res.section,
        data: toArrayBuffer(res.sectionData),
      };
      pe.setSectionByEntry(RESOURCE_ENTRY, newSection);
      return true;
    })
  );
}

export async function getResourceFileInfo(buffer: Buffer) {
  return pipe(
    await getBreedInfoOffsets(await parsePE(buffer)),
    E.map((res) => {
      const breedId = res.sectionData.readUInt32LE(res.breedIdOffset);
      const displayName = readNullTerminatedString(
        res.sectionData,
        res.displayNameOffset
      );
      const spriteName = readNullTerminatedString(
        res.sectionData,
        res.mainSpriteNameOffset
      );
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const itemName = spriteName.split('_').pop()!;
      return {
        displayName,
        breedId,
        spriteName,
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
        stringToLengthUnicodeUint8('Antennae'),
        stringToLengthUnicodeUint8(toFileName)
      )
    );
    offsetsChanged.push(
      renameInBuffer(
        buf,
        stringToAsciiUint8('Antennae'),
        stringToAsciiUint8(toFileName)
      )
    );
    const totalChanges = sumBy(offsetsChanged, (it) => it.offsets.length);
    if (totalChanges < 1) {
      return E.left('No changes were made in the file');
    }

    await fsPromises.writeFile(tempPath, buf);
    const existingInfos = E.sequenceArray(
      await getExistingBreedInfos(filePath)
    );
    if (E.isLeft(existingInfos)) {
      return existingInfos;
    }
    const existingBreedIds = existingInfos.right.map((it) => it.breedId);
    sortByNumeric(existingBreedIds, identity);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const highest = safeLast(existingBreedIds)!;
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
      newId,
      newFilePath,
      changes: offsetsChanged.map(toStringResult),
    });
  });
}

export type RenameClothingFileResult = PromiseInner<
  ReturnType<typeof renameClothingFile>
>;
