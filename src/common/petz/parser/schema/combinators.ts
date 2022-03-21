import type { SchemaElement } from './schema';
import { HasTypeWitness, typeWitness } from './schema-types';

export interface TypedProperty<PropertyName, Type>
  extends HasTypeWitness<Type> {
  propertyName: PropertyName;
  item: SchemaElement;
}

type TypedPropertyArray = ReadonlyArray<TypedProperty<unknown, unknown>>;

type ExtractType<
  A extends TypedProperty<unknown, unknown>,
  PropertyName
> = A extends TypedProperty<PropertyName, infer Type> ? Type : never;

type SequenceProperties<
  A extends ReadonlyArray<TypedProperty<unknown, unknown>>
> = {
  [P in A[number]['propertyName'] & string]: ExtractType<A[number], P>;
};

export interface SSequence<A extends TypedPropertyArray>
  extends HasTypeWitness<SequenceProperties<A>> {
  tag: 'sSequence';
  properties: A;
}

function sequenceProperties<A extends TypedPropertyArray>(
  properties: A
): SSequence<A> {
  return {
    tag: 'sSequence',
    properties,
    typeWitness: typeWitness(),
  };
}

function prop<PropertyName extends string, Item extends SchemaElement>(
  propertyName: PropertyName,
  item: Item
): TypedProperty<PropertyName, Item['typeWitness']['type']> {
  return {
    propertyName,
    item,
    typeWitness: item.typeWitness,
  };
}

export type SCombinator = SSequence<any>;

export const sComb = {
  sequenceProperties,
  prop,
};
