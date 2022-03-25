import { useEffect } from 'react';
import style from './layout.module.scss';
import { useAppContext, useAppReactiveNodes } from '../context/context';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { Tabs, tabs } from './Tabs';
import { FlashMessages } from '../framework/FlashMessage';
import { Button } from '../framework/Button';

export const Layout = () => {
  const { appVersion } = useAppContext();
  const { currentTabNode, userSettingsRemote } = useAppReactiveNodes();
  const currentTab = useReactiveVal(currentTabNode);
  const { TabContent } = tabs[currentTab];
  useEffect(() => {
    const setStyle = () =>
      document.documentElement.style.setProperty(
        '--htmlFontSize',
        `${userSettingsRemote.getValue().fontSize}px`
      );
    setStyle();
    return userSettingsRemote.listenable.listen(setStyle);
  }, [userSettingsRemote]);
  return (
    <div className={style.main}>
      <div className={style.header}>
        <div className={style.logoArea}>
          <div className={style.logo}>Deus Hex</div>
          <div className={style.version}>{appVersion}</div>
        </div>
        <div className={style.tabsWrapper}>
          <Tabs />
        </div>
        <div className={style.zoom}>
          <Button
            label="Minus"
            onClick={() => {
              userSettingsRemote.setRemotePartialFn((it) => ({
                fontSize: it.fontSize - 1,
              }));
            }}
          />
          <Button
            label="Plus"
            onClick={() => {
              userSettingsRemote.setRemotePartialFn((it) => ({
                fontSize: it.fontSize + 1,
              }));
            }}
          />
        </div>
      </div>
      <div className={style.mainContent}>
        <TabContent />
      </div>
      <FlashMessages />
    </div>
  );
};
