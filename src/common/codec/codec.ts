import { Either } from '../fp-ts/fp';

export interface DecodeResult<A> {
  result: A;
  bytesRead: number;
}

export type EncodeCallback = (buffer: Buffer, offset: number) => number;

interface Encoder<A, Context> {
  encode: (a: A, buffer: Buffer, offset: number, context: Context) => number;
}

interface Decoder<A, Context> {
  decode: (
    buffer: Buffer,
    offset: number,
    context: Context
  ) => Either<string, DecodeResult<A>>;
}

export type Codec<A, Context = unknown> = Encoder<A, Context> &
  Decoder<A, Context> & {
    typeLabels: Array<string>;
  };

export type CodecType<A extends Codec<any, any>> = A extends Codec<infer B, any>
  ? B
  : never;

export function decode<A, Context>(
  buffer: Buffer,
  codec: Codec<A, Context>,
  offset = 0,
  context: Context
) {
  return codec.decode(buffer, offset, context);
}
