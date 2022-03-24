import { combinators as c } from '../../codec/combinator';
import { primitives as p } from '../../codec/primitive';
import { CodecType } from '../../codec/codec';
import { ResourceEntryId } from './rsrc-utility';

export const rcDataId: ResourceEntryId = {
  type: 10,
  level: 1003,
  language: 1033,
};
export const rcDataCodec = c.sequenceProperties('rcData', [
  c.prop('unknownFlag', p.uInt32LE),
  c.prop('spriteName', p.mkNullTerminatedAsciiStringFixedLength(0x20)),
  c.prop('displayName', p.mkNullTerminatedAsciiStringFixedLength(0x20)),
  c.prop('breedId', p.uInt32LE),
  c.prop('tag', p.uInt32LE),
]);

export type RcData = CodecType<typeof rcDataCodec>;
