import React, { useContext } from 'react';
import { isNully } from '../../common/null';
import type { MainIpc } from '../../main/app/main-ipc';
import { getContextBridgeIpcRenderer } from '../context-bridge';
import { IpcHandler } from '../../common/ipc';
import { useMkAppReactiveNodes } from './app-reactive-nodes';
import { PromiseInner } from '../../common/promise';

function contextName<Name extends string>(name: Name): `${Name}Context` {
  return `${name}Context`;
}

function contextHook<Name extends string>(name: Name): `use${Name}` {
  return `use${name}`;
}

export type ContextReturn<A, Name extends string> = {
  [Key in Name as `${Key}Context`]: React.Context<A | null>;
} & {
  [Key in Name as `use${Key}`]: () => A;
};

export function mkNullableContext<A>() {
  return <Name extends string>(name: Name) => {
    const context = React.createContext<A | null>(null);
    context.displayName = name;
    return {
      [contextName(name)]: context,
      [contextHook(name)]: (): A => {
        const result = useContext(context);
        if (isNully(result))
          throw new Error(`Context not set: ${context.displayName}`);
        return result;
      },
    } as ContextReturn<A, Name>;
  };
}

export type AppContext = PromiseInner<ReturnType<typeof useMkAppContext>>;

export async function useMkAppContext() {
  const appReactiveNodes = useMkAppReactiveNodes();
  const ipc = getContextBridgeIpcRenderer();
  const mainIpc = new IpcHandler<MainIpc>(ipc).target;
  const isDev = await mainIpc.isDev();
  const appVersion = await mainIpc.getAppVersion();
  return { mainIpc, isDev, appVersion, appReactiveNodes };
}

export const { useAppContext, AppContextContext } =
  mkNullableContext<AppContext>()('AppContext');

export const useMainIpc = () => useAppContext().mainIpc;
export const useAppReactiveNodes = () => useAppContext().appReactiveNodes;
