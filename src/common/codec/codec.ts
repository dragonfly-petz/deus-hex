import { Either } from '../fp-ts/fp';

export interface DecodeResult<A> {
  result: A;
  bytesRead: number;
}

interface Encoder<A> {
  encode: (a: A, buffer: Buffer, offset: number) => number;
}

interface Decoder<A> {
  decode: (buffer: Buffer, offset: number) => Either<string, DecodeResult<A>>;
}

export type Codec<A> = Encoder<A> &
  Decoder<A> & {
    typeLabels: Array<string>;
  };

export type CodecType<A extends Codec<any>> = A extends Codec<infer B>
  ? B
  : never;

export function decode<A>(buffer: Buffer, codec: Codec<A>, offset = 0) {
  return codec.decode(buffer, offset);
}
