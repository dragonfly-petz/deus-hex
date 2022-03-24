import style from './layout.module.scss';
import { useAppContext, useAppReactiveNodes } from '../context/context';
import { useReactiveNode } from '../reactive-state/reactive-hooks';
import { Tabs, tabs } from './Tabs';
import { FlashMessages } from '../framework/FlashMessage';

export const Layout = () => {
  const { appVersion } = useAppContext();
  const { currentTabNode } = useAppReactiveNodes();
  const currentTab = useReactiveNode(currentTabNode);
  const { TabContent } = tabs[currentTab];
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
      </div>
      <div className={style.mainContent}>
        <TabContent />
      </div>
      <FlashMessages />
    </div>
  );
};
