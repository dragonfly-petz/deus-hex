import { HasTypeWitness, typeWitness } from './schema-types';

export interface SPrimUint8Array extends HasTypeWitness<'uint8Array'> {
  tag: 'sprimUint8Array';
}

function uint8Array(): SPrimUint8Array {
  return {
    tag: 'sprimUint8Array',
    typeWitness: typeWitness(),
  };
}

export type SPrimitive = SPrimUint8Array;

export const sPrim = {
  uint8Array,
};
