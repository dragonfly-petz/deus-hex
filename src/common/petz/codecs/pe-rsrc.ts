import { combinators as c } from '../../codec/combinator';
import { primitives as p } from '../../codec/primitive';

export const resDirTableCodec = c.sequenceProperties('resDirTable', [
  c.prop('characteristics', p.uInt32LE),
  c.prop('timeStamp', p.uInt32LE),
  c.prop('majorVer', p.uInt16LE),
  c.prop('minorVer', p.uInt16LE),
  c.prop('numNameEntries', p.uInt16LE),
  c.prop('numIdEntries', p.uInt16LE),
]);

const resDirEntryNameCodec = c.sequenceProperties('resDirEntryName', [
  c.prop('nameOffset', p.uInt32LE),
  c.prop('offset', p.uInt32LE),
]);
const resDirEntryIdCodec = c.sequenceProperties('resDirEntryId', [
  c.prop('intId', p.uInt32LE),
  c.prop('offset', p.uInt32LE),
]);

const resDirTableWithNameEntries = c.withFollowingEntries(
  resDirTableCodec,
  'numNameEntries',
  'entriesName',
  resDirEntryNameCodec
);
export const resDirTableWithEntries = c.withFollowingEntries(
  resDirTableWithNameEntries,
  'numIdEntries',
  'entriesId',
  resDirEntryIdCodec
);
