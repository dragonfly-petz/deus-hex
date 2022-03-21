import { useMemo } from 'react';
import { AppContextContext, useMkAppContext } from './context/context';
import { RenderAsync } from './framework/render';
import { Layout } from './layout/Layout';

export default function App() {
  const appContextP = useMemo(useMkAppContext, []);
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
