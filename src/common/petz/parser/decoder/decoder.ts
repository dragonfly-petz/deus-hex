import { mkDecoder } from './decoder-types';
import { E } from '../../../fp-ts/fp';

export const decode = mkDecoder((_element, _data, _offset) => {
  return E.left('asdf');
});
