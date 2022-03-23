/* eslint-disable no-bitwise */
import { pipe } from 'fp-ts/function';
import { Either } from 'fp-ts/Either';
import { ImageSectionHeader } from 'pe-library/dist/format/ImageSectionHeaderArray';
import * as Buffer from 'buffer';
import { combinators as c } from '../../codec/combinator';
import { primitives as p } from '../../codec/primitive';
import { taggedValue, TaggedValue } from '../../tagged-value';
import { Codec, CodecType, decode, EncodeCallback } from '../../codec/codec';
import { E } from '../../fp-ts/fp';
import { run } from '../../function';

interface PeRsrcContext {
  sectionRvaOffset: number;
  resDirectoryStringCallbacks: Array<EncodeCallback>;
  resDataCallbacks: Array<EncodeCallback>;
}

export function defaultPeRsrcContext(sectionRvaOffset: number): PeRsrcContext {
  return {
    sectionRvaOffset,
    resDirectoryStringCallbacks: [],
    resDataCallbacks: [],
  };
}

export const resDirTableBase = c.sequenceProperties('resDirTable', [
  c.prop('characteristics', p.uInt32LE),
  c.prop('timeStamp', p.uInt32LE),
  c.prop('majorVer', p.uInt16LE),
  c.prop('minorVer', p.uInt16LE),
  c.prop('numNameEntries', p.uInt16LE),
  c.prop('numIdEntries', p.uInt16LE),
]);

type EntryName = TaggedValue<'stringId', string> | TaggedValue<'id', number>;
type EntryVal =
  | TaggedValue<'resDir', ResDirTable>
  | TaggedValue<'resData', ResDataEntry>;

const resDataEntryBaseCodec = c.sequenceProperties('resDataEntryBase', [
  c.prop('dataRva', p.uInt32LE),
  c.prop('size', p.uInt32LE),
  c.prop('codePage', p.uInt32LE),
  c.prop('reserved', p.uInt32LE),
]);
type ResDataEntryBase = CodecType<typeof resDataEntryBaseCodec>;

export type ResDataEntry = ResDataEntryBase & { data: Uint8Array };
const resDataEntryCodec: Codec<ResDataEntry, PeRsrcContext> = {
  typeLabels: ['resDataEntry'],
  encode: (a, buffer, offset, context) => {},
  decode: (buffer, offset, context) => {
    const baseRes = resDataEntryBaseCodec.decode(buffer, offset, context);

    return pipe(
      baseRes,
      E.chain((res) => {
        const dataCodec = p.mkUint8Array(res.result.size);
        return pipe(
          dataCodec.decode(
            buffer,
            res.result.dataRva - context.sectionRvaOffset,
            context
          ),
          E.map((data) => {
            return {
              bytesRead: res.bytesRead,
              result: {
                ...res.result,
                data: data.result,
              },
            };
          })
        );
      })
    );
  },
};

export interface ResDirEntry {
  name: EntryName;
  val: EntryVal;
}

const resDirEntryBaseCodec = c.sequenceProperties('resDirEntryBase', [
  c.prop('nameOrId', p.uInt32LE),
  c.prop('offset', p.uInt32LE),
]);

function mkResDirEntryCodec(
  entryType: 'name' | 'id'
): Codec<ResDirEntry, PeRsrcContext> {
  return {
    typeLabels: ['resDirEntry', entryType],
    encode: (a, buffer, offset) => {},
    decode: (buffer, offset, context) => {
      const baseRes = resDirEntryBaseCodec.decode(buffer, offset, context);
      if (E.isLeft(baseRes)) return baseRes;
      const highBit = 0x80000000;

      const nameRes = run(() => {
        if (entryType === 'name') {
          const realOffset = baseRes.right.result.nameOrId & ~highBit;
          return pipe(
            p.unicode2ByteStringWithLengthPrefix.decode(
              buffer,
              realOffset,
              context
            ),
            E.map((res) => taggedValue('stringId', res.result))
          );
        }
        return E.right(taggedValue('id', baseRes.right.result.nameOrId));
      });
      if (E.isLeft(nameRes)) return nameRes;
      const name = nameRes.right;

      const realOffset = baseRes.right.result.offset & ~highBit;
      const eVal: Either<string, EntryVal> = run(() => {
        if (baseRes.right.result.offset & highBit) {
          return pipe(
            resDirTableWithEntries.decode(buffer, realOffset, context),
            E.map((res) => taggedValue('resDir', res.result))
          );
        }
        return pipe(
          resDataEntryCodec.decode(buffer, realOffset, context),
          E.map((res) => {
            return taggedValue('resData', res.result);
          })
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

export function decodeFromSection(info: ImageSectionHeader, buffer: Buffer) {
  const context = defaultPeRsrcContext(info.virtualAddress);
  const codecRes = decode(buffer, resDirTableWithEntries, 0, context);
  return codecRes;
}
