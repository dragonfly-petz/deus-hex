import { pipe } from 'fp-ts/function';
import { E } from '../fp-ts/fp';
import { Codec } from './codec';
import { objectEntries, unsafeObjectFromEntries } from '../object';
import { assertEqual } from '../assert';
import {
  bytesToString,
  bytesToStringNullTerminated,
  readUint16Array,
  readUint8Array,
  stringToBytes,
  stringToBytesPadNull,
  writeUint16Array,
} from '../buffer';

const numberTypes = {
  UInt32LE: 4,
  UInt16LE: 2,
  UInt8: 1,
} as const;

type NumberType = keyof typeof numberTypes;

function mkNumberCodec<Name extends NumberType>(name: Name): Codec<number> {
  const readName: `read${Name}` = `read${name}`;
  const writeName: `write${Name}` = `write${name}`;
  return {
    typeLabels: [name],
    decode: (buffer, offset) => {
      return E.right({
        result: buffer[readName](offset),
        bytesRead: numberTypes[name],
      });
    },
    encode: (a, buffer, offset) => {
      buffer[writeName](a, offset);
      return numberTypes[name];
    },
  };
}

function toCodecKey<Name extends string>(name: Name): Uncapitalize<Name> {
  const first = name[0].toLowerCase();
  return `${first}${name.substring(1)}` as any;
}

const numberCodecs = unsafeObjectFromEntries(
  objectEntries(numberTypes).map(([key]) => {
    return [toCodecKey(key), mkNumberCodec(key)];
  })
);

function mkUint8Array(length: number): Codec<Uint8Array> {
  return {
    typeLabels: ['uInt8Array'],
    decode: (buffer, offset) => {
      return E.right({
        result: readUint8Array(buffer, offset, length),
        bytesRead: length,
      });
    },
    encode: (a, buffer, offset) => {
      assertEqual(a.length, length, 'Buffer length should match codec length');
      buffer.set(a, offset);
      return length;
    },
  };
}

function mkNullTerminatedAsciiStringFixedLength(length: number): Codec<string> {
  return {
    typeLabels: ['asciiString'],
    decode: (buffer, offset) => {
      const arr = readUint8Array(buffer, offset, length);
      const result = bytesToStringNullTerminated(arr);
      return E.right({
        result,
        bytesRead: length,
      });
    },
    encode: (a, buffer, offset) => {
      const asBytes = stringToBytesPadNull(a, length);
      buffer.set(new Uint8Array(asBytes), offset);
      return length;
    },
  };
}

function mkUnicode2ByteString(length: number): Codec<string> {
  return {
    typeLabels: ['unicode2ByteString'],
    decode: (buffer, offset) => {
      const arr = readUint16Array(buffer, offset, length);
      const result = bytesToString(arr);
      return E.right({
        result,
        bytesRead: length * 2,
      });
    },
    encode: (a, buffer, offset) => {
      const asBytes = stringToBytes(a);
      const uint16 = new Uint16Array(asBytes);
      return writeUint16Array(buffer, uint16, offset);
    },
  };
}

const unicode2ByteStringWithLengthPrefix: Codec<string> = {
  typeLabels: ['2ByteStringWithLengthPrefix'],
  decode: (buffer, offset, context) => {
    const length = buffer.readUInt16LE(offset);
    const strCodec = mkUnicode2ByteString(length);
    return pipe(
      strCodec.decode(buffer, offset + 2, context),
      E.map((it) => {
        return {
          result: it.result,
          bytesRead: it.bytesRead + 2,
        };
      })
    );
  },
  encode: (a, buffer, offset, context) => {
    const strCodec = mkUnicode2ByteString(a.length);
    buffer.writeUInt16LE(a.length, offset);
    const bytesWritten = strCodec.encode(a, buffer, offset + 2, context);
    return bytesWritten + 2;
  },
};

export const primitives = {
  ...numberCodecs,
  unicode2ByteStringWithLengthPrefix,
  mkNullTerminatedAsciiStringFixedLength,
  mkUint8Array,
  mkUnicode2ByteString,
};
