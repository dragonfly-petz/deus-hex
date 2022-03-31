import React, { useContext, useMemo } from 'react';
import { isNully } from '../../common/null';
import type { MainIpcBase } from '../../main/app/main-ipc';
import { getContextBridgeIpcRenderer } from '../context-bridge';
import { IpcHandler, mainIpcChannel } from '../../common/ipc';
import {
  AppReactiveNodesAsync,
  AppReactiveNodesStatic,
  mkAsyncReactiveNodes,
} from './app-reactive-nodes';
import { PromiseInner } from '../../common/promise';
import type { DomIpcBase } from '../dom-ipc';
import { throwFromEither } from '../../common/fp-ts/either';
import { UserSettings } from '../../main/app/persisted/user-settings';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { AppHelper } from './app-helper';

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
export type AppReactiveNodes = AppReactiveNodesStatic & AppReactiveNodesAsync;

export async function mkAppContext(
  domIpc: DomIpcBase,
  appReactiveNodesStatic: AppReactiveNodesStatic
) {
  const mainIpc = new IpcHandler<MainIpcBase>(
    mainIpcChannel,
    getContextBridgeIpcRenderer()
  ).target;

  const isDev = throwFromEither(await mainIpc.isDev());
  const appVersion = throwFromEither(await mainIpc.getAppVersion());
  const asyncNodes = await mkAsyncReactiveNodes(mainIpc, domIpc);
  const appReactiveNodes = {
    ...appReactiveNodesStatic,
    ...asyncNodes,
  };
  const appHelper = new AppHelper(mainIpc, appReactiveNodes);

  if (appReactiveNodes.editorParams.getValue() !== null) {
    appReactiveNodesStatic.currentTabNode.setValue('editor');
  }

  return {
    mainIpc,
    isDev,
    appVersion,
    appReactiveNodes,
    domIpc,
    appHelper,
  };
}

export const { useAppContext, AppContextContext } =
  mkNullableContext<AppContext>()('AppContext');

export const useMainIpc = () => useAppContext().mainIpc;
export const useAppHelper = () => useAppContext().appHelper;
export const useAppReactiveNodes = () => useAppContext().appReactiveNodes;

export function useUserSettingNode<A extends keyof UserSettings & string>(
  a: A
): ReactiveVal<UserSettings[A]> {
  const { userSettingsRemote } = useAppReactiveNodes();
  return useMemo(() => {
    return userSettingsRemote.fmap.strict((it) => it[a]);
  }, [userSettingsRemote, a]);
}

export function useUserSetting<A extends keyof UserSettings>(a: A) {
  return useReactiveVal(useUserSettingNode(a));
}
