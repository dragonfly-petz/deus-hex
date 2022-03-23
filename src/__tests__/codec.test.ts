import { Chance } from 'chance';
import { primitives as p } from '../common/codec/primitive';
import { E } from '../common/fp-ts/fp';
import { Codec } from '../common/codec/codec';

type CodecGenerator<A> = () => { val: A; byteLength: number; codec: Codec<A> };

function withChance(block: (chance: Chance.Chance) => () => void) {
  const chance = new Chance(new Chance().string({ length: 8 }));
  // eslint-disable-next-line jest/valid-describe-callback
  describe(`ChanceSeed: ${chance.seed}`, block(chance));
}

function testCodec<A>(codecName: string, codecGen: CodecGenerator<A>) {
  // eslint-disable-next-line jest/valid-title
  test(codecName, () => {
    const { val, byteLength, codec } = codecGen();
    const buffer = Buffer.from(new Uint8Array(byteLength));
    const encoded = codec.encode(val, buffer, 0, null);
    expect(encoded).toEqual(byteLength);
    const decoded = codec.decode(buffer, 0, null);
    expect(E.isRight(decoded)).toEqual(true);
    if (E.isRight(decoded)) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(decoded.right.bytesRead).toEqual(byteLength);
      // eslint-disable-next-line jest/no-conditional-expect
      expect(decoded.right.result).toEqual(val);
    }
  });
}

function repeatTest<A extends readonly unknown[]>(
  testBlock: (n: string, ...args2: A) => void,
  times: number,
  name: string,
  ...args: A
) {
  for (let i = 0; i < times; i++) {
    testBlock(`${name}:${i}`, ...args);
  }
}

function mkCodecTest<A>(name: string, codec: CodecGenerator<A>) {
  return {
    name,
    codec,
  };
}

const mkCodecTests = (chance: Chance.Chance) => {
  return [
    mkCodecTest('uInt16LE', () => {
      return {
        codec: p.uInt16LE,
        val: chance.integer({ min: 0, max: 2 ** 16 - 1 }),
        byteLength: 2,
      };
    }),
    mkCodecTest('uInt32LE', () => {
      return {
        codec: p.uInt32LE,
        val: chance.integer({ min: 0, max: 2 ** 32 - 1 }),
        byteLength: 4,
      };
    }),
    mkCodecTest('uint8Array', () => {
      const length = chance.integer({ min: 1, max: 100 });
      const val = new Array<number>(length)
        .fill(0)
        .map(() => chance.integer({ min: 0, max: 2 ** 8 - 1 }));
      return {
        codec: p.mkUint8Array(length),
        val: Uint8Array.from(val),
        byteLength: length,
      };
    }),
  ];
};

describe('codec', () => {
  withChance((chance) => {
    return () => {
      for (const test of mkCodecTests(chance)) {
        repeatTest(testCodec, 100, test.name, test.codec as any);
      }
    };
  });
});
