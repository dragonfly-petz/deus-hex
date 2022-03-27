import { globalLogger } from './logger';

export function toArrayBuffer(buf: Buffer) {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; i++) {
    view[i] = buf[i];
  }
  return ab;
}

export function bytesToString(bytes: ArrayLike<number>) {
  return Array.from(bytes)
    .map((it) => {
      return String.fromCharCode(it);
    })
    .join('');
}

export function bytesToStringNullTerminated(bytes: ArrayLike<number>) {
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte === 0) {
      break;
    }
    str += String.fromCharCode(byte);
  }
  return str;
}

export function stringToBytes(string: string) {
  return string.split('').map((it) => it.charCodeAt(0));
}

export function stringToBytesPadNull(string: string, length: number) {
  const arr = new Array(length).fill(0);
  string.split('').forEach((it, idx) => {
    arr[idx] = it.charCodeAt(0);
  });
  return arr;
}

export function debugBuffer(
  buf: ArrayLike<number>,
  offset: number,
  length: number
) {
  const strings = new Array<string>();
  const bytes = new Array<number>();
  for (let i = offset; i < offset + length; i++) {
    if (i === buf.length) {
      globalLogger.info(strings.join(' '));
      globalLogger.info(bytesToString(bytes));
      throw new Error(
        `Buffer overun - asked for idx ${i} but buffer is ${buf.length}`
      );
    }
    bytes.push(buf[i]);
    strings.push(buf[i].toString(16));
  }
  globalLogger.info(
    `DebugBuffer: Length: ${length}, bytesRead: ${bytes.length}`
  );
  globalLogger.info(strings.join(' '));
  globalLogger.info(bytesToString(bytes));
}

export function readUint8Array(buf: Buffer, offset: number, length: number) {
  const arr = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = buf[offset + i];
  }
  return arr;
}

export function readUint16Array(buf: Buffer, offset: number, length: number) {
  const arr = new Uint16Array(length);
  for (let i = 0; i < length; i++) {
    arr[i] = buf.readUInt16LE(offset + i * 2);
  }
  return arr;
}

export function writeUint16Array(
  buf: Buffer,
  arr: Uint16Array,
  offset: number
) {
  for (let i = 0; i < arr.length; i++) {
    buf.writeUInt16LE(arr[i], offset + i * 2);
  }
  return arr.length * 2;
}
