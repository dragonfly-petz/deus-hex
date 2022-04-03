import { run } from './function';

export type Disposer = () => void;

export interface Disposable {
  dispose(): void;
}

export function sequenceDisposers(disposers: Array<Disposer>) {
  return () => {
    disposers.forEach(run);
  };
}
