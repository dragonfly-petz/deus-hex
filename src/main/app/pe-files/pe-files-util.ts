import { app } from 'electron';
import path from 'path';
import * as Buffer from 'buffer';
import * as PE from 'pe-library';
import { uuidV4 } from '../../../common/uuid';
import { globalLogger } from '../../../common/logger';
import { fsPromises } from '../util/fs-promises';
import { run } from '../../../common/function';
import { isDev } from '../util';
import { getRepoRootPath } from '../asset-path';
import { assertEqual } from '../../../common/assert';

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
  await block(tmpPath);
}

function debugBuffer(buf: Buffer, offset: number, length: number) {
  const strings = new Array<string>();
  for (let i = offset; i < offset + length; i++) {
    strings.push(buf[i].toString(16));
  }
  console.log(strings.join(' '));
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
  const exe = PE.NtExecutable.from(buffer);
  return exe;
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
  let lastOffset = buf.indexOf(from, 0);
  console.log(`searching for ${toHexString(from)}`);

  while (lastOffset > -1) {
    console.log(`Replacing val at offset ${toHex(lastOffset)}`);
    buf.set(to, lastOffset);
    lastOffset = buf.indexOf(from, lastOffset + to.length);
  }
}

export async function renameClothingFile(
  filePath: string,
  from: string,
  to: string
) {
  await withTempFile(async (temp) => {
    await fsPromises.copyFile(filePath, temp);
    const buf = await fsPromises.readFile(temp);
    removeSymbolsNumber(buf);
    renameInBuffer(buf, stringToAsciiUint8(from), stringToAsciiUint8(to));
    renameInBuffer(
      buf,
      stringToLengthUnicodeUint8(from),
      stringToLengthUnicodeUint8(to)
    );
    renameInBuffer(
      buf,
      stringToLengthUnicodeUint8(from.toUpperCase()),
      stringToLengthUnicodeUint8(to.toUpperCase())
    );
    await fsPromises.writeFile(temp, buf);
    const pe = await parsePE(buf);
  });
}
