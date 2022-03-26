import {
  baseMigration,
  MigrationFinal,
} from '../../../common/migration/migration';
import { assertTypesEqual } from '../../../common/type-assertion';

export interface UserSettings {
  fontSize: number;
}

assertTypesEqual<UserSettings, MigrationFinal<typeof userSettingsMigration>>(
  true
);

export const userSettingsMigration = baseMigration(() => {
  return { fontSize: 10 };
});

export const userSettingsDefault = userSettingsMigration.default(null);
