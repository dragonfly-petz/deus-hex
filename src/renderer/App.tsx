import { useMemo } from 'react';
import { AppContextContext, mkAppContext } from './context/context';
import { RenderAsync } from './framework/render';
import { Layout } from './layout/Layout';
import { DomIpcBase } from './dom-ipc';
import { AppReactiveNodes } from './context/app-reactive-nodes';

export default function App({
  domIpc,
  appReactiveNodes,
}: {
  domIpc: DomIpcBase;
  appReactiveNodes: AppReactiveNodes;
}) {
  const appContextP = useMemo(
    () => mkAppContext(domIpc, appReactiveNodes),
    [domIpc, appReactiveNodes]
  );
  return (
    <RenderAsync
      value={appContextP}
      render={(appContext) => {
        return (
          <AppContextContext.Provider value={appContext}>
            <Layout />
          </AppContextContext.Provider>
        );
      }}
    />
  );
}
