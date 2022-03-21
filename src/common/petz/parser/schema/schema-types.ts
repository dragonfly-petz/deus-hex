export interface TypeWitness<A> {
  tag: 'typeWitness';
  type: A;
}

export function typeWitness<A>(): TypeWitness<A> {
  return {
    tag: 'typeWitness',
    type: `TYPEWITNESS` as unknown as A,
  };
}

export interface HasTypeWitness<Type> {
  typeWitness: TypeWitness<Type>;
}

export type TypeFromWitness<A extends TypeWitness<unknown>> =
  A extends TypeWitness<infer B> ? B : never;
