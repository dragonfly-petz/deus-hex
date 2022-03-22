import {
  EntryTuples,
  NumericValueKeys,
  unsafeObjectFromEntries,
} from '../object';
import { E } from '../fp-ts/fp';
import { Codec } from './codec';

interface TypedProperty<PropertyName, Type> {
  propertyName: PropertyName;
  codec: Codec<Type>;
}

type ExtractType<
  A extends TypedProperty<unknown, unknown>,
  PropertyName
> = A extends TypedProperty<PropertyName, infer Type> ? Type : never;

type TypedPropertyArray = ReadonlyArray<TypedProperty<unknown, any>>;

type SequenceProperties<A extends TypedPropertyArray> = {
  [P in A[number]['propertyName'] & string]: ExtractType<A[number], P>;
};

function sequenceProperties<A extends TypedPropertyArray>(
  typeLabel: string,
  props: A
): Codec<SequenceProperties<A>> {
  return {
    typeLabels: [typeLabel],
    decode: (buffer, offset) => {
      const entries = new Array<EntryTuples<SequenceProperties<A>>>();
      let bytesRead = 0;
      for (const prop of props) {
        const res = prop.codec.decode(buffer, offset + bytesRead);
        if (E.isLeft(res)) {
          return res;
        }
        bytesRead += res.right.bytesRead;
        entries.push([prop.propertyName, res.right.result] as any);
      }
      return E.right({
        result: unsafeObjectFromEntries(entries) as SequenceProperties<A>,
        bytesRead,
      });
    },
    encode: (a, buffer, offset) => {
      let bytesWritten = 0;
      for (const prop of props) {
        bytesWritten += prop.codec.encode(
          a[prop.propertyName as keyof typeof a],
          buffer,
          offset + bytesWritten
        );
      }
      return bytesWritten;
    },
  };
}

function prop<PropertyName extends string, A>(
  propertyName: PropertyName,
  codec: Codec<A>
): TypedProperty<PropertyName, A> {
  return {
    propertyName,
    codec,
  };
}

function listWithLength<A>(num: number, codec: Codec<A>): Codec<Array<A>> {
  return {
    typeLabels: [...codec.typeLabels, 'listWithLength'],
    encode: (a, buffer, offset) => {},
    decode: (buffer, offset) => {
      const result = new Array<A>();
      let bytesRead = 0;
      for (let i = 0; i < num; i++) {
        const res = codec.decode(buffer, offset + bytesRead);
        if (E.isLeft(res)) {
          return res;
        }
        bytesRead += res.right.bytesRead;
        result.push(res.right.result);
      }
      return E.right({ bytesRead, result });
    },
  };
}

function withFollowingEntries<A extends object, EntriesKey extends string, B>(
  startCodec: Codec<A>,
  entriesLengthKey: NumericValueKeys<A>,
  entriesKey: EntriesKey,
  entryCodec: Codec<B>
): Codec<A & { [K in EntriesKey]: Array<B> }> {
  return {
    typeLabels: [...startCodec.typeLabels, 'withFollowingEntries'],
    encode: (a, buffer, offset) => {},
    decode: (buffer, offset) => {
      const val = startCodec.decode(buffer, offset);
      if (E.isLeft(val)) return val;
      let { bytesRead } = val.right;
      const entriesLength = val.right.result[entriesLengthKey];
      const subCodec = listWithLength(
        entriesLength as unknown as number,
        entryCodec
      );
      const entries = subCodec.decode(buffer, offset + bytesRead);
      if (E.isLeft(entries)) {
        return entries;
      }
      bytesRead += entries.right.bytesRead;
      const result = {
        ...val.right.result,
        ...unsafeObjectFromEntries([[entriesKey, entries.right.result]]),
      };
      return E.right({ bytesRead, result });
    },
  };
}

export const combinators = {
  withFollowingEntries,
  sequenceProperties,
  prop,
};
