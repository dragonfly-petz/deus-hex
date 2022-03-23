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
    resDirectoryStringStartOffset: nullable<number>(),
    resDataStartOffset: nullable<number>(),
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
    // max of the end of these is where resource data starts
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
      const offsetForNext = offset + 8;
      const offsetToStore =
        a.val.tag === 'resDir' ? offsetForNext | highBit : offsetForNext;

      const entryData: CodecType<typeof resDirEntryBaseCodec> = {
        nameOrId: a.name.tag === 'id' ? a.name.value : 0,
        offset: offsetToStore,
      };
      if (a.name.tag === 'stringId') {
        const nameToSave = a.name.value;
        context.resDirectoryStringCallbacks.push((buf, off) => {
          resDirEntryBaseCodec.encode(
            {
              ...entryData,
              offset: off | highBit,
            },
            buffer,
            offset,
            context
          );
          return p.unicode2ByteStringWithLengthPrefix.encode(
            nameToSave,
            buf,
            off,
            context
          );
        });
      }
      const bytesWritten = resDirEntryBaseCodec.encode(
        entryData,
        buffer,
        offset,
        context
      );
      if (a.val.tag === 'resData') {
        resDataEntryCodec.encode(a.val.value, buffer, offset, context);
      } else {
        resDirTableWithEntries.encode(
          a.val.value,
          buffer,
          offset + bytesWritten,
          context
        );
      }
      // max of the end of these is where resource directory string starts

      context.resDirectoryStringStartOffset = Math.max(
        bytesWritten,
        context.resDirectoryStringStartOffset ?? 0
      );
      return bytesWritten;
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
  return decode(buffer, resDirTableWithEntries, 0, context);
}

export function encodeToSection(info: ImageSectionHeader, table: ResDirTable) {
  const context = defaultPeRsrcContext(info.virtualAddress);
  const buffer = Buffer.from(new Uint8Array(1e6));
  resDirTableWithEntries.encode(table, buffer, 0, context);
  if (isNully(context.resDirectoryStringStartOffset)) {
    throw new Error(
      'Expected to find resDirectoryStringStartOffset in context'
    );
  }
  if (isNully(context.resDataStartOffset)) {
    throw new Error('Expected to find resDataStartOffset in context');
  }
  let dirBytesWritten = 0;
  for (const callback of context.resDirectoryStringCallbacks) {
    dirBytesWritten += callback(
      buffer,
      context.resDirectoryStringStartOffset + dirBytesWritten
    );
  }
  let dataBytesWritten = 0;
  for (const callback of context.resDataCallbacks) {
    dataBytesWritten += callback(
      buffer,
      context.resDataStartOffset + dataBytesWritten
    );
  }
  return buffer;
}
