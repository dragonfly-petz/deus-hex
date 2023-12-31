import { useEffect } from 'react';
import style from './layout.module.scss';
import { useAppReactiveNodes } from '../context/context';
import {
  sequenceReactiveProperties,
  useListenReactiveVal,
  useReactiveVal,
} from '../reactive-state/reactive-hooks';
import { tabs, TabSettings } from './Tabs';
import { FlashMessages } from '../framework/FlashMessage';
import { globalSh } from '../framework/global-style-var';
import { Header } from './Header';
import { emptyComponent, FunctionalComponent } from '../framework/render';
import { GlobalModals } from '../framework/Modal';
import { GlobalDropFile } from '../framework/GlobalDropFile';
import { classNames } from '../../common/react';

export function Layout() {
  const { currentTabNode, userSettingsRemote } = useAppReactiveNodes();
  const currentTab = useReactiveVal(currentTabNode);
  const {
    useGetDeps,
    TabContent,
    TabLeftBar = emptyComponent,
    TabRightBar = emptyComponent,
    tabSettings,
  } = tabs[currentTab];
  useEffect(() => {
    const setStyle = () => {
      globalSh.setOnHtml(document.documentElement, globalSh.getCurrentStyle());
    };
    setStyle();
    return globalSh.listenable.listen(setStyle);
  }, []);

  const currentFontSize = sequenceReactiveProperties({
    globalFontSize: userSettingsRemote.fmapStrict((it) => it.fontSize),
    localFontSizeAdjust: useAppReactiveNodes().localFontSizeAdjust,
  }).fmapStrict((it) => it.globalFontSize + it.localFontSizeAdjust);

  useListenReactiveVal(
    currentFontSize,
    (it) =>
      globalSh.updateCurrentStyle({
        htmlFontSize: globalSh.px(it),
      }),
    true
  );

  return (
    <div className={style.main}>
      <Header />
      <div className={style.mainContent}>
        <TabC
          TabContent={TabContent}
          tabSettings={tabSettings}
          TabLeftBar={TabLeftBar}
          TabRightBar={TabRightBar}
          useGetDeps={useGetDeps}
        />
      </div>
      <FlashMessages />
      <GlobalDropFile />
      <GlobalModals />
    </div>
  );
}

function TabC({
  TabLeftBar,
  TabRightBar,
  TabContent,
  useGetDeps,
  tabSettings,
}: {
  TabLeftBar: FunctionalComponent<any>;
  TabContent: FunctionalComponent<any>;
  TabRightBar: FunctionalComponent<any>;
  useGetDeps: () => any;
  tabSettings: TabSettings | undefined;
}) {
  const deps = useGetDeps();
  return (
    <>
      <div className={style.leftBar}>
        <TabLeftBar {...deps} />
      </div>
      <div
        className={classNames(
          style.centerContent,
          tabSettings?.centerContentClass
        )}
      >
        <TabContent {...deps} />
      </div>
      <div className={style.rightBar}>
        <TabRightBar {...deps} />
      </div>
    </>
  );
}
