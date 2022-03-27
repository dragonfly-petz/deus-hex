export interface Versioned<A> {
  version: number;
  value: A;
}

type ToFunc<A> = A extends [infer B, infer C] ? (b: B) => C : never;

type MigrationFunctions<A extends ReadonlyArray<[any, any]>> = {
  readonly [K in keyof A]: ToFunc<A[K]>;
};

type MigrationFromTypes<A extends ReadonlyArray<[any, any]>> = {
  readonly [K in keyof A]: A[K] extends [infer B, infer C] ? B | C : never;
}[number];

export class Migration<A, B, PreviousTypes extends Array<[any, any]>> {
  constructor(
    private migrationFunctions: MigrationFunctions<[...PreviousTypes, [A, B]]>
  ) {}

  next<C>(migrate: (b: B) => C) {
    return new Migration<B, C, [...PreviousTypes, [A, B]]>([
      ...this.migrationFunctions,
      migrate,
    ]);
  }

  default(value: PreviousTypes[0][0]) {
    return this.fromVersioned({
      version: 0,
      value,
    });
  }

  fromVersioned(
    versioned: Versioned<MigrationFromTypes<[...PreviousTypes, [A, B]]>>
  ): B {
    return this.migrationFunctions
      .slice(versioned.version)
      .reduce((last, currentFn) => {
        return currentFn(last as any);
      }, versioned.value as any);
  }

  toVersioned(value: B): Versioned<B> {
    return {
      version: this.migrationFunctions.length,
      value,
    };
  }
}

export function baseMigration<A>(fn: () => A) {
  return new Migration<null, A, []>([fn]);
}

export type MigrationFinal<A extends Migration<any, any, any>> =
  A extends Migration<any, infer B, any> ? B : never;

export type MigrationWithTarget<A> = Migration<any, A, any>;
