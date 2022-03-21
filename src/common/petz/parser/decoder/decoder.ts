import { mkDecoder } from './decoder-types';
import { E } from '../../../fp-ts/fp';

const decode = mkDecoder((element, data, offset) => {
  return E.left('asdf');
});
