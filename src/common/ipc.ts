import type { IpcRenderer } from 'electron';
import { isNully } from './null';
import { uuidV4 } from './uuid';

export const mainIpcChannel = 'mainIpcChannel';

export interface IpcCallMessage {
  id: string;
  funcName: string;
  args: Array<any>;
}

export interface IpcReplyMessage {
  id: string;
  result: any;
}

export interface IpcTransport {
  on: IpcRenderer['on'];
  send: IpcRenderer['send'];
}

interface ResolveHolder {
  message: IpcCallMessage;
  resolve: (arg: any) => void;
}

export class IpcHandler<A extends object> implements ProxyHandler<A> {
  readonly target = new Proxy<A>({} as unknown as A, this);

  private readonly resolveFunctions = new Map<string, ResolveHolder>();

  constructor(private transport: IpcTransport) {
    transport.on(mainIpcChannel, (_, arg: IpcReplyMessage) => {
      this.handleReply(arg);
    });
  }

  private handleReply(arg: IpcReplyMessage) {
    const resolve = this.resolveFunctions.get(arg.id);
    if (isNully(resolve)) {
      throw new Error(`No resolution func found for id ${arg.id}`);
    }
    this.resolveFunctions.delete(arg.id);
    resolve.resolve(arg.result);
  }

  get(_target: A, property: string): any {
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
      this.transport.send(mainIpcChannel, message);
      return returnPromise;
    };
  }
}
