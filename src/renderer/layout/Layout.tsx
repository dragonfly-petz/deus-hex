import { useEffect } from 'react';
import style from './layout.module.scss';
import { useAppReactiveNodes } from '../context/context';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { tabs } from './Tabs';
import { FlashMessages } from '../framework/FlashMessage';
import { globalSh } from '../framework/global-style-var';
import { Header } from './Header';
import { UserSettings } from '../../main/app/persisted/user-settings';
import { emptyComponent } from '../framework/render';
import { GlobalModals } from '../framework/Modal';

export const Layout = () => {
  const { currentTabNode, userSettingsRemote } = useAppReactiveNodes();
  const currentTab = useReactiveVal(currentTabNode);
  const {
    useGetDeps,
    TabContent,
    TabLeftBar = emptyComponent,
    TabRightBar = emptyComponent,
  } = tabs[currentTab];
  useEffect(() => {
    const setStyle = () => {
      globalSh.setOnHtml(document.documentElement, globalSh.getCurrentStyle());
    };
    setStyle();
    return globalSh.listenable.listen(setStyle);
  }, []);
  useEffect(() => {
    const updateStyle = (us: UserSettings) =>
      globalSh.updateCurrentStyle({
        htmlFontSize: globalSh.px(us.fontSize),
      });
    updateStyle(userSettingsRemote.getValue());
    return userSettingsRemote.listenable.listen(updateStyle);
  }, [userSettingsRemote]);
  const TabC = () => {
    const deps = useGetDeps();
    return (
      <>
        <div className={style.leftBar}>
          <TabLeftBar {...deps} />
        </div>
        <div className={style.centerContent}>
          <TabContent {...deps} />
        </div>
        <div className={style.rightBar}>
          <TabRightBar {...deps} />
        </div>
      </>
    );
  };
  return (
    <div className={style.main}>
      <Header />
      <div className={style.mainContent}>
        <TabC />
      </div>
      <FlashMessages />
      <GlobalModals />
    </div>
  );
};
