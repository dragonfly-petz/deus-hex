import { SchemaElement } from '../schema/schema';
import { Result } from '../../../result';
import { TypeFromWitness } from '../schema/schema-types';

export interface DecodeResult<Element extends SchemaElement> {
  result: TypeFromWitness<Element['typeWitness']>;
  bytesConsumed: number;
}

export type DecodeElement<Element extends SchemaElement> = (
  element: Element,
  data: Uint8Array,
  offset: number
) => Result<DecodeResult<Element>>;

export function mkDecoder<Element extends SchemaElement>(
  fn: DecodeElement<Element>
) {
  return fn;
}
