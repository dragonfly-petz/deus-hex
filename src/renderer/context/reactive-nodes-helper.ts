import { UserSettings } from '../../main/app/persisted/user-settings';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { useAppReactiveNodes } from './context';

export function useReactiveUserSetting<A>(fn: (it: UserSettings) => A): A {
  return useReactiveVal(
    useAppReactiveNodes().userSettingsRemote.fmapStrict(fn)
  );
}
