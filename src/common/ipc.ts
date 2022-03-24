import type { IpcMain, IpcMainEvent, IpcRenderer } from 'electron';
import { isNully } from './null';
import { uuidV4 } from './uuid';
import { globalErrorReporter, tryCatchAsync } from './error';
import { Either } from './fp-ts/fp';

export const mainIpcChannel = 'mainIpcChannel' as const;
export const domIpcChannel = 'domIpcChannel' as const;
type IpcChannel = typeof mainIpcChannel | typeof domIpcChannel;

export interface IpcCallMessage {
  id: string;
  funcName: string;
  args: Array<any>;
}

export interface IpcReplyMessage {
  id: string;
  result: any;
}

export interface IpcTransportRenderer {
  tag: 'renderer';
  on: IpcRenderer['on'];
  send: IpcRenderer['send'];
}

export interface IpcTransportMainToDom {
  tag: 'mainToDom';
  on: IpcMain['on'];
  send: IpcRenderer['send'];
}

export interface IpcTransportMain {
  tag: 'main';
  on: IpcMain['on'];
}

type IpcTransportHandler = IpcTransportRenderer | IpcTransportMainToDom;

type IpcTransportConnect = IpcTransportRenderer | IpcTransportMain;

interface ResolveHolder {
  message: IpcCallMessage;
  resolve: (arg: any) => void;
}

type Wrap<F> = F extends (...args: infer Args) => infer Res
  ? (
      ...args: Args
    ) => Res extends Promise<Either<string, infer C>>
      ? Promise<Either<string, C>>
      : Res extends Promise<infer B>
      ? Promise<Either<string, B>>
      : never
  : never;

export type WrapWithCaughtError<A extends object> = {
  [P in keyof A]: Wrap<A[P]>;
};

export class IpcHandler<A extends object>
  implements ProxyHandler<WrapWithCaughtError<A>>
{
  readonly target = new Proxy<WrapWithCaughtError<A>>(
    {} as unknown as WrapWithCaughtError<A>,
    this
  );

  private readonly resolveFunctions = new Map<string, ResolveHolder>();

  constructor(
    private channel: IpcChannel,
    private transport: IpcTransportHandler
  ) {
    transport.on(this.channel, (_, arg: IpcReplyMessage) => {
      this.handleReply(arg);
    });
  }

  private handleReply(arg: IpcReplyMessage) {
    const resolve = this.resolveFunctions.get(arg.id);
    if (isNully(resolve)) {
      throw new Error(`No resolution func found for id ${arg.id}`);
    }
    this.resolveFunctions.delete(arg.id);
    resolve.resolve(globalErrorReporter.caughtErrorToEitherJoin(arg.result));
  }

  get(_target: WrapWithCaughtError<A>, property: string): any {
    // Used by some libraries to check if something is a promise.
    if (property === 'then') return undefined;
    return async (...args: Array<any>) => {
      const id = uuidV4();
      const message: IpcCallMessage = {
        id,
        funcName: property,
        args,
      };
      const returnPromise = new Promise((resolve) => {
        this.resolveFunctions.set(id, {
          message,
          resolve,
        });
      });
      this.transport.send(this.channel, message);
      return returnPromise;
    };
  }
}

export function connectIpc<A>(
  target: A,
  channel: IpcChannel,
  transport: IpcTransportConnect
) {
  transport.on(channel, async (event, arg: IpcCallMessage) => {
    const targetAsAny = target as any;
    if (isNully(targetAsAny[arg.funcName])) {
      throw new Error(`Ipc target had no property named ${arg.funcName}`);
    }
    if (typeof targetAsAny[arg.funcName] !== 'function') {
      throw new Error(`Ipc target ${arg.funcName} is not a function`);
    }
    const res = await tryCatchAsync(() =>
      targetAsAny[arg.funcName](...arg.args)
    );
    const message: IpcReplyMessage = {
      id: arg.id,
      result: res,
    };
    if (transport.tag === 'main') {
      const eventAsMain = event as IpcMainEvent;
      eventAsMain.reply(channel, message);
    } else {
      transport.send(channel, message);
    }
  });
}
