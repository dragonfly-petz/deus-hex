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

export function debugBuffer(buf: Buffer, offset: number, length: number) {
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
  console.log(`Length: ${length}, bytesRead: ${bytes.length}`);
  globalLogger.info(strings.join(' '));
  globalLogger.info(bytesToString(bytes));
}

export function toUint8Array(buf: Buffer, offset: number, length: number) {
  const arr = new Uint8Array(length);
  for (let i = offset; i < offset + length; i++) {
    arr[i] = buf[i];
  }
  return arr;
}
