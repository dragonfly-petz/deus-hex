import style from './ClothingRename.module.scss';
import { FormInput, FormItem, FormLabel } from '../framework/form/form';
import { Button } from '../framework/Button';
import { userSettingsDefault } from '../../main/app/persisted/user-settings';
import { useAppReactiveNodes } from '../context/context';
import { useReactiveVal } from '../reactive-state/reactive-hooks';

export function Settings() {
  const { userSettingsRemote } = useAppReactiveNodes();
  const current = useReactiveVal(
    userSettingsRemote.fmapStrict((it) => it.fontSize)
  );
  return (
    <div className={style.main}>
      <FormItem>
        <>
          <FormLabel>Base Font Size</FormLabel>
          <FormInput>
            Current: {current}
            <Button
              tooltip="Reduce base font size"
              icon="faMinus"
              onClick={() => {
                userSettingsRemote.setRemotePartialFn((it) => ({
                  fontSize: it.fontSize - 1,
                }));
              }}
            />
            <Button
              tooltip="Increase base font size"
              icon="faPlus"
              onClick={() => {
                userSettingsRemote.setRemotePartialFn((it) => ({
                  fontSize: it.fontSize + 1,
                }));
              }}
            />
            <Button
              tooltip="Reset base font size"
              icon="faSync"
              onClick={() => {
                userSettingsRemote.setRemotePartialFn(() => ({
                  fontSize: userSettingsDefault.fontSize,
                }));
              }}
            />
          </FormInput>
        </>
      </FormItem>
    </div>
  );
}
