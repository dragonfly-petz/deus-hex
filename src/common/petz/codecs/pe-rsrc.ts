/* eslint-disable no-bitwise */
import { pipe } from 'fp-ts/function';
import { Either } from 'fp-ts/Either';
import { combinators as c } from '../../codec/combinator';
import { primitives as p } from '../../codec/primitive';
import { taggedValue, TaggedValue } from '../../tagged-value';
import { Codec, CodecType } from '../../codec/codec';
import { E } from '../../fp-ts/fp';
import { run } from '../../function';

export const resDirTableBase = c.sequenceProperties('resDirTable', [
  c.prop('characteristics', p.uInt32LE),
  c.prop('timeStamp', p.uInt32LE),
  c.prop('majorVer', p.uInt16LE),
  c.prop('minorVer', p.uInt16LE),
  c.prop('numNameEntries', p.uInt16LE),
  c.prop('numIdEntries', p.uInt16LE),
]);

type EntryName =
  | TaggedValue<'stringOffset', number>
  | TaggedValue<'id', number>;
type EntryVal =
  | TaggedValue<'resDir', ResDirTable>
  | TaggedValue<'resData', ResDataEntry>;

const resDataEntryCodec = c.sequenceProperties('resDataEntryBase', [
  c.prop('dataRva', p.uInt32LE),
  c.prop('size', p.uInt32LE),
  c.prop('codePage', p.uInt32LE),
  c.prop('reserved', p.uInt32LE),
]);
export type ResDataEntry = CodecType<typeof resDataEntryCodec>;

export interface ResDirEntry {
  name: EntryName;
  val: EntryVal;
}

const resDirEntryBaseCodec = c.sequenceProperties('resDirEntryBase', [
  c.prop('nameOrId', p.uInt32LE),
  c.prop('offset', p.uInt32LE),
]);

function mkResDirEntryCodec(entryType: 'name' | 'id'): Codec<ResDirEntry> {
  return {
    typeLabels: ['resDirEntry', entryType],
    encode: (a, buffer, offset) => {},
    decode: (buffer, offset) => {
      const baseRes = resDirEntryBaseCodec.decode(buffer, offset);
      if (E.isLeft(baseRes)) return baseRes;
      const name = run(() => {
        if (entryType === 'name') {
          return taggedValue('stringOffset', baseRes.right.result.nameOrId);
        }
        return taggedValue('id', baseRes.right.result.nameOrId);
      });
      const highBit = 0x80000000;
      const realOffset = baseRes.right.result.offset & ~highBit;
      const eVal: Either<string, EntryVal> = run(() => {
        if (baseRes.right.result.offset & highBit) {
          return pipe(
            resDirTableWithEntries.decode(buffer, realOffset),
            E.map((res) => taggedValue('resDir', res.result))
          );
        }
        return pipe(
          resDataEntryCodec.decode(buffer, realOffset),
          E.map((res) => taggedValue('resData', res.result))
        );
      });
      return pipe(
        eVal,
        E.map((val) => {
          return {
            bytesRead: baseRes.right.bytesRead,
            result: {
              name,
              val,
            },
          };
        })
      );
    },
  };
}

const resDirTableWithNameEntries = c.withFollowingEntries(
  resDirTableBase,
  'numNameEntries',
  'entriesName',
  mkResDirEntryCodec('name')
);
export const resDirTableWithEntries = c.withFollowingEntries(
  resDirTableWithNameEntries,
  'numIdEntries',
  'entriesId',
  mkResDirEntryCodec('id')
);
export type ResDirTable = CodecType<typeof resDirTableWithEntries>;
