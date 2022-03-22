import { E } from '../fp-ts/fp';
import { Codec } from './codec';
import { objectEntries, unsafeObjectFromEntries } from '../object';
import { assertEqual } from '../assert';
import { toUint8Array } from '../buffer';

const numberTypes = {
  UInt32LE: 4,
  UInt16LE: 2,
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
      console.log(`copying buffer from ${offset} with length ${length}`);
      return E.right({
        result: toUint8Array(buffer, offset, length),
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

export const primitives = {
  ...numberCodecs,
  mkUint8Array,
};
