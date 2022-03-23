import { Chance } from 'chance';
import { primitives as p } from '../common/codec/primitive';
import { combinators as c } from '../common/codec/combinator';
import { E } from '../common/fp-ts/fp';
import { Codec, CodecType } from '../common/codec/codec';
import { bytesToString, stringToBytes } from '../common/buffer';
import { chanceUtil } from '../common/chance-util';

type CodecGenerator<A> = () => { val: A; byteLength: number; codec: Codec<A> };

function withChance(block: (chance: Chance.Chance) => () => void) {
  const chance = new Chance(new Chance().string({ length: 8 }));
  // eslint-disable-next-line no-console
  console.log(`USING CHANCE SEED: "${chance.seed}"`);
  // eslint-disable-next-line jest/valid-describe-callback
  describe(`WithChance`, block(chance));
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
  // eslint-disable-next-line jest/valid-title
  describe(name, () => {
    for (let i = 0; i < times; i++) {
      testBlock(`${name}: ${i}`, ...args);
    }
  });
}

function mkCodecTest<A>(name: string, codec: CodecGenerator<A>) {
  return {
    name,
    codec,
  };
}

const testSequencePropertiesCodec = c.sequenceProperties('testCodec', [
  c.prop('prop1', p.uInt32LE),
  c.prop('prop2', p.uInt32LE),
  c.prop('prop3', p.unicode2ByteStringWithLengthPrefix),
  c.prop('prop4', p.uInt16LE),
  c.prop('propFollowingLength', p.uInt8),
]);
const mkCodecTests = (chance: Chance.Chance) => {
  return [
    mkCodecTest('uInt8', () => {
      return {
        codec: p.uInt8,
        val: chanceUtil.uInt8(chance),
        byteLength: 1,
      };
    }),
    mkCodecTest('uInt16LE', () => {
      return {
        codec: p.uInt16LE,
        val: chanceUtil.uInt16(chance),
        byteLength: 2,
      };
    }),
    mkCodecTest('uInt32LE', () => {
      return {
        codec: p.uInt32LE,
        val: chanceUtil.uInt32(chance),
        byteLength: 4,
      };
    }),
    mkCodecTest('uint8Array', () => {
      const length = chance.integer({ min: 1, max: 100 });
      const val = new Array<number>(length)
        .fill(0)
        .map(() => chanceUtil.uInt8(chance));
      return {
        codec: p.mkUint8Array(length),
        val: Uint8Array.from(val),
        byteLength: length,
      };
    }),
    mkCodecTest('unicode2ByteStringWithLengthPrefix', () => {
      const string = chance.string({
        length: chance.integer({ min: 0, max: 200 }),
      });
      const byteLength = 2 + string.length * 2;
      return {
        codec: p.unicode2ByteStringWithLengthPrefix,
        val: string,
        byteLength,
      };
    }),
    mkCodecTest('listWithLength', () => {
      const length = chance.integer({ min: 1, max: 100 });
      const val = new Array<number>(length)
        .fill(0)
        .map(() => chanceUtil.uInt32(chance));

      const byteLength = val.length * 4;
      return {
        codec: c.listWithLength(length, p.uInt32LE),
        val,
        byteLength,
      };
    }),
    mkCodecTest('sequenceProperties', () => {
      const val: CodecType<typeof testSequencePropertiesCodec> = {
        prop1: chanceUtil.uInt32(chance),
        prop2: chanceUtil.uInt32(chance),
        prop3: chance.string({
          length: chance.integer({ min: 0, max: 200 }),
        }),
        prop4: chanceUtil.uInt16(chance),
        propFollowingLength: chanceUtil.uInt8(chance),
      };
      const byteLength = 4 + 4 + 2 + val.prop3.length * 2 + 2 + 1;
      return {
        codec: testSequencePropertiesCodec,
        val,
        byteLength,
      };
    }),
    mkCodecTest('withFollowingEntries', () => {
      const withFollowingEntriesCodec = c.withFollowingEntries(
        testSequencePropertiesCodec,
        'propFollowingLength',
        'propEntries',
        p.uInt32LE
      );
      const propFollowingLength = chance.integer({ min: 0, max: 10 });
      const val: CodecType<typeof withFollowingEntriesCodec> = {
        prop1: chanceUtil.uInt32(chance),
        prop2: chanceUtil.uInt32(chance),
        prop3: chance.string({
          length: chance.integer({ min: 0, max: 200 }),
        }),
        prop4: chanceUtil.uInt16(chance),
        propFollowingLength,
        propEntries: new Array(propFollowingLength)
          .fill(null)
          .map(() => chanceUtil.uInt32(chance)),
      };

      const byteLength =
        4 + 4 + 2 + val.prop3.length * 2 + 2 + 1 + propFollowingLength * 4;
      return {
        codec: withFollowingEntriesCodec,
        val,
        byteLength,
      };
    }),
  ];
};
describe('utility', () => {
  test('bytesToString', () => {
    const string = 'asdfsadf';
    expect(bytesToString(stringToBytes(string))).toEqual(string);
  });
});
describe('codec', () => {
  withChance((chance) => {
    return () => {
      for (const test of mkCodecTests(chance)) {
        repeatTest(testCodec, 100, test.name, test.codec as any);
      }
    };
  });
});
