import {
  EntryTuples,
  NumericValueKeys,
  unsafeObjectFromEntries,
} from '../object';
import { E } from '../fp-ts/fp';
import { Codec } from './codec';
import { assertEqual } from '../assert';

interface TypedProperty<PropertyName, Type, Context> {
  propertyName: PropertyName;
  codec: Codec<Type, Context>;
}

type ExtractType<
  A extends TypedProperty<unknown, unknown, unknown>,
  PropertyName
> = A extends TypedProperty<PropertyName, infer Type, any> ? Type : never;

type TypedPropertyArray = ReadonlyArray<TypedProperty<unknown, any, any>>;

type SequenceProperties<A extends TypedPropertyArray> = {
  [P in A[number]['propertyName'] & string]: ExtractType<A[number], P>;
};

function sequenceProperties<A extends TypedPropertyArray, Context>(
  typeLabel: string,
  props: A
): Codec<SequenceProperties<A>, Context> {
  return {
    typeLabels: [typeLabel],
    decode: (buffer, offset, context) => {
      const entries = new Array<EntryTuples<SequenceProperties<A>>>();
      let bytesRead = 0;
      for (const propDef of props) {
        const res = propDef.codec.decode(buffer, offset + bytesRead, context);
        if (E.isLeft(res)) {
          return res;
        }
        bytesRead += res.right.bytesRead;
        entries.push([propDef.propertyName, res.right.result] as any);
      }
      return E.right({
        result: unsafeObjectFromEntries(entries) as SequenceProperties<A>,
        bytesRead,
      });
    },
    encode: (a, buffer, offset, context) => {
      let bytesWritten = 0;
      for (const propDef of props) {
        bytesWritten += propDef.codec.encode(
          a[propDef.propertyName as keyof typeof a],
          buffer,
          offset + bytesWritten,
          context
        );
      }
      return bytesWritten;
    },
  };
}

function prop<PropertyName extends string, A, Context>(
  propertyName: PropertyName,
  codec: Codec<A>
): TypedProperty<PropertyName, A, Context> {
  return {
    propertyName,
    codec,
  };
}

function listWithLength<A, Context>(
  num: number,
  codec: Codec<A, Context>
): Codec<Array<A>, Context> {
  return {
    typeLabels: [...codec.typeLabels, 'listWithLength'],
    encode: (a, buffer, offset, context) => {
      assertEqual(a.length, num, `Expected list length to equal codec num`);
      let bytesWritten = 0;
      for (let i = 0; i < num; i++) {
        bytesWritten += codec.encode(
          a[i],
          buffer,
          offset + bytesWritten,
          context
        );
      }
      return bytesWritten;
    },
    decode: (buffer, offset, context) => {
      const result = new Array<A>();
      let bytesRead = 0;
      for (let i = 0; i < num; i++) {
        const res = codec.decode(buffer, offset + bytesRead, context);
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

function withFollowingEntries<
  A extends object,
  EntriesKey extends string,
  B,
  Context
>(
  startCodec: Codec<A, Context>,
  entriesLengthKey: NumericValueKeys<A>,
  entriesKey: EntriesKey,
  entryCodec: Codec<B, Context>
): Codec<A & { [K in EntriesKey]: Array<B> }, Context> {
  return {
    typeLabels: [...startCodec.typeLabels, 'withFollowingEntries'],
    encode: (a, buffer, offset, context) => {
      let bytesWritten = startCodec.encode(a, buffer, offset, context);
      const entriesLength = a[entriesLengthKey];
      const subCodec = listWithLength(
        entriesLength as unknown as number,
        entryCodec
      );
      bytesWritten += subCodec.encode(
        a[entriesKey],
        buffer,
        offset + bytesWritten,
        context
      );
      return bytesWritten;
    },
    decode: (buffer, offset, context) => {
      const val = startCodec.decode(buffer, offset, context);
      if (E.isLeft(val)) return val;
      let { bytesRead } = val.right;
      const entriesLength = val.right.result[entriesLengthKey];
      const subCodec = listWithLength(
        entriesLength as unknown as number,
        entryCodec
      );
      const entries = subCodec.decode(buffer, offset + bytesRead, context);
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
  listWithLength,
  withFollowingEntries,
  sequenceProperties,
  prop,
};
