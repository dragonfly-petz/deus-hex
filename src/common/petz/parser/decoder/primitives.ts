import { mkDecoder } from './decoder-types';
import { E } from '../../../fp-ts/fp';

const sprimUint8Array = mkDecoder((_element, _data, _offset) => {
  return E.left('fail');
});

export const dPrim = {
  sprimUint8Array,
};
