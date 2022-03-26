import style from './layout.module.scss';
import { Tabs } from './Tabs';
import { Button } from '../framework/Button';
import { useAppContext, useAppReactiveNodes } from '../context/context';
import { Heading } from './text';
import { userSettingsDefault } from '../../main/app/persisted/user-settings';

export const Header = () => {
  const { appVersion } = useAppContext();
  const { userSettingsRemote } = useAppReactiveNodes();

  return (
    <div className={style.header}>
      <div className={style.logoArea}>
        <div className={style.logo}>
          <Heading>Deus Hex</Heading>
        </div>
        <div className={style.version}>v{appVersion}</div>
      </div>
      <div className={style.tabsWrapper}>
        <Tabs />
      </div>
      <div className={style.zoom}>
        <Button
          tooltip="Reduce font size"
          icon="faMinus"
          onClick={() => {
            userSettingsRemote.setRemotePartialFn((it) => ({
              fontSize: it.fontSize - 1,
            }));
          }}
        />
        <Button
          tooltip="Increase font size"
          icon="faPlus"
          onClick={() => {
            userSettingsRemote.setRemotePartialFn((it) => ({
              fontSize: it.fontSize + 1,
            }));
          }}
        />
        <Button
          tooltip="Reset font size"
          icon="faSync"
          onClick={() => {
            userSettingsRemote.setRemotePartialFn(() => ({
              fontSize: userSettingsDefault.fontSize,
            }));
          }}
        />
      </div>
    </div>
  );
};
