import React, { useContext } from 'react';
import { isNully } from '../../common/null';
import type { MainIpcBase } from '../../main/app/main-ipc';
import { getContextBridgeIpcRenderer } from '../context-bridge';
import { IpcHandler, mainIpcChannel } from '../../common/ipc';
import {
  AppReactiveNodesStatic,
  mkAsyncReactiveNodes,
} from './app-reactive-nodes';
import { PromiseInner } from '../../common/promise';
import type { DomIpcBase } from '../dom-ipc';
import { throwFromEither } from '../../common/fp-ts/either';

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

export type AppContext = PromiseInner<ReturnType<typeof mkAppContext>>;

export async function mkAppContext(
  domIpc: DomIpcBase,
  appReactiveNodes: AppReactiveNodesStatic
) {
  const mainIpc = new IpcHandler<MainIpcBase>(
    mainIpcChannel,
    getContextBridgeIpcRenderer()
  ).target;

  const isDev = throwFromEither(await mainIpc.isDev());
  const appVersion = throwFromEither(await mainIpc.getAppVersion());
  const asyncNodes = await mkAsyncReactiveNodes(mainIpc, domIpc);
  return {
    mainIpc,
    isDev,
    appVersion,
    appReactiveNodes: {
      ...appReactiveNodes,
      ...asyncNodes,
    },
    domIpc,
  };
}

export const { useAppContext, AppContextContext } =
  mkNullableContext<AppContext>()('AppContext');

export const useMainIpc = () => useAppContext().mainIpc;
export const useAppReactiveNodes = () => useAppContext().appReactiveNodes;
