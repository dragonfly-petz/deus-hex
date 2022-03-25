import {
  baseMigration,
  MigrationFinal,
} from '../../../common/migration/migration';
import { assertTypesEqual } from '../../../common/type-assertion';

export interface UserSettings {
  fontSize: number;
}

assertTypesEqual<UserSettings, MigrationFinal<typeof persistedStateMigration>>(
  true
);

export const persistedStateMigration = baseMigration(() => {
  return { fontSize: 10 };
});
