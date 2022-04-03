import {
  baseMigration,
  MigrationFinal,
} from '../../../common/migration/migration';
import { assertTypesEqual } from '../../../common/type-assertion';
import { nullable } from '../../../common/null';

export interface UserSettings {
  fontSize: number;
  petzFolder: string | null;
}

assertTypesEqual<UserSettings, MigrationFinal<typeof userSettingsMigration>>(
  true
);

export const userSettingsMigration = baseMigration(() => {
  return { fontSize: 9 };
}).next((it) => ({
  ...it,
  petzFolder: nullable<string>(),
}));

export const userSettingsDefault = userSettingsMigration.default(null);
