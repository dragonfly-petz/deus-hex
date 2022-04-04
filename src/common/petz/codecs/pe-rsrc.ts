/* eslint-disable no-bitwise */
import { pipe } from 'fp-ts/function';
import { Either } from 'fp-ts/Either';
import { ImageSectionHeader } from 'pe-library/dist/format/ImageSectionHeaderArray';
import { combinators as c } from '../../codec/combinator';
import { primitives as p } from '../../codec/primitive';
import { taggedValue, TaggedValue } from '../../tagged-value';
import { Codec, CodecType, decode, EncodeCallback } from '../../codec/codec';
import { E } from '../../fp-ts/fp';
import { run } from '../../function';
import { isNully, nullable } from '../../null';
import { assertEqual } from '../../assert';

type PeRsrcContext = ReturnType<typeof defaultPeRsrcContext>;

export function defaultPeRsrcContext(sectionRvaOffset: number) {
  return {
    sectionRvaOffset,
    nextResTableOffset: 0,
    nextDataDataOffset: 0,
    resDirectoryStringStartOffset: nullable<number>(),
    resDirectoryStringCallbacks: new Array<EncodeCallback>(),
    resDataCallbacks: new Array<EncodeCallback>(),
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
  encode: (a, buffer, offset, context) => {
    const dataDataOffset = context.nextDataDataOffset;
    // add some padding between them just to be friendly
    const gapBetweenEntries = 0x100;
    context.nextDataDataOffset = byteAlign(
      context.nextDataDataOffset + a.data.length + gapBetweenEntries
    );
    a.size = a.data.length;
    a.dataRva = dataDataOffset + context.sectionRvaOffset;
    p.mkUint8Array(a.data.length).encode(
      a.data,
      buffer,
      dataDataOffset,
      context
    );
    return resDataEntryBaseCodec.encode(a, buffer, offset, context);
  },
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
const highBit = 0x80000000;

function mkResDirEntryCodec(
  entryType: 'name' | 'id'
): Codec<ResDirEntry, PeRsrcContext> {
  return {
    typeLabels: ['resDirEntry', entryType],
    encode: (a, buffer, offset, context) => {
      if (entryType === 'name') {
        assertEqual(
          a.name.tag,
          'stringId',
          'Expected a string name for a name entry type'
        );
      } else {
        assertEqual(
          a.name.tag,
          'id',
          'Expected an id name for an id entry type'
        );
      }
      const nameOrIdOffset = offset;
      if (a.name.tag === 'stringId') {
        const nameToSave = a.name.value;
        context.resDirectoryStringCallbacks.push((buf, off) => {
          p.uInt32LE.encode(off + highBit, buffer, nameOrIdOffset, context);
          return p.unicode2ByteStringWithLengthPrefix.encode(
            nameToSave,
            buf,
            off,
            context
          );
        });
      } else {
        p.uInt32LE.encode(a.name.value, buffer, nameOrIdOffset, context);
      }

      const offsetOffset = offset + 4;

      if (a.val.tag === 'resDir') {
        const nextTableOffset = nextResDirTableOffset(a.val.value, context);
        p.uInt32LE.encode(
          nextTableOffset + highBit,
          buffer,
          offsetOffset,
          context
        );

        const tableBytesWritten = resDirTableCodec.encode(
          a.val.value,
          buffer,
          nextTableOffset,
          context
        );
        context.resDirectoryStringStartOffset = Math.max(
          nextTableOffset + tableBytesWritten,
          context.resDirectoryStringStartOffset ?? 0
        );
      } else {
        const valToSave = a.val.value;
        context.resDataCallbacks.push((buf, off) => {
          p.uInt32LE.encode(off, buf, offsetOffset, context);
          return resDataEntryCodec.encode(valToSave, buf, off, context);
        });
      }
      return 8;
    },
    decode: (buffer, offset, context) => {
      const baseRes = resDirEntryBaseCodec.decode(buffer, offset, context);
      if (E.isLeft(baseRes)) return baseRes;

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
            resDirTableCodec.decode(buffer, realOffset, context),
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
export const resDirTableCodec = c.withFollowingEntries(
  resDirTableWithNameEntries,
  'numIdEntries',
  'entriesId',
  mkResDirEntryCodec('id')
);

function nextResDirTableOffset(a: ResDirTable, context: PeRsrcContext) {
  const resDirTableSize = 4 + 4 + 2 + 2 + 2 + 2;
  const resDirEntrySize = 4 + 4;
  const size =
    resDirTableSize +
    resDirEntrySize * (a.entriesId.length + a.entriesName.length);
  const offsetToUse = context.nextResTableOffset;
  context.nextResTableOffset = offsetToUse + size;
  return offsetToUse;
}

export type ResDirTable = CodecType<typeof resDirTableCodec>;

export function decodeFromSection(info: ImageSectionHeader, buffer: Buffer) {
  const context = defaultPeRsrcContext(info.virtualAddress);
  return decode(buffer, resDirTableCodec, 0, context);
}

export function encodeToSection(info: ImageSectionHeader, table: ResDirTable) {
  const context = defaultPeRsrcContext(info.virtualAddress);
  // hopefully this is big enough - just easier than using
  // a growing buffer
  const buffer = Buffer.from(new Uint8Array(10e6));
  nextResDirTableOffset(table, context);
  resDirTableCodec.encode(table, buffer, 0, context);
  if (isNully(context.resDirectoryStringStartOffset)) {
    throw new Error(
      'Expected to find resDirectoryStringStartOffset in context'
    );
  }
  let offset = context.resDirectoryStringStartOffset;
  for (const callback of context.resDirectoryStringCallbacks) {
    offset += callback(buffer, offset);
  }
  const dataEntrySize = 4 + 4 + 4 + 4;
  context.nextDataDataOffset = byteAlign(
    offset + dataEntrySize * context.resDataCallbacks.length
  );
  for (const callback of context.resDataCallbacks) {
    offset += callback(buffer, offset);
  }
  return buffer.slice(0, context.nextDataDataOffset + 1);
}

function byteAlign(num: number) {
  return num + (4 - (num % 4));
}
