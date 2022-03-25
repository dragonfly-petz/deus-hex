import { baseMigration, MigrationFinal } from '../common/migration/migration';
import { assertTypesEqual } from '../common/type-assertion';

interface MyFoo {
  foo: boolean;
  bar: number;
}

const migrate = baseMigration(() => ({
  foo: false,
})).next((it) => ({
  ...it,
  bar: 10,
}));
assertTypesEqual<MyFoo, MigrationFinal<typeof migrate>>(true);

const defaultMyFoo: MyFoo = {
  foo: false,
  bar: 10,
};

describe('migration', () => {
  test('default', () => {
    expect(migrate.default(null)).toEqual(defaultMyFoo);

    expect(
      migrate.fromVersioned({
        version: 0,
        value: null,
      })
    ).toEqual(defaultMyFoo);

    expect(
      migrate.fromVersioned({
        version: 1,
        value: { foo: false },
      })
    ).toEqual(defaultMyFoo);
    expect(
      migrate.fromVersioned({
        version: 2,
        value: defaultMyFoo,
      })
    ).toStrictEqual(defaultMyFoo);
    expect(
      migrate.fromVersioned({
        version: 1,
        value: { foo: true },
      })
    ).toEqual({ ...defaultMyFoo, foo: true });
  });
});
