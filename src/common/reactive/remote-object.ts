import { Listenable } from './listener';
import { ReactiveVal } from './reactive-node';

export class RemoteObject<A extends object> implements ReactiveVal<A> {
  constructor(
    private value: A,
    private setAsync: (val: A) => Promise<unknown>,
    private srcEmitter: Listenable<[A]>
  ) {
    this.srcEmitter.listen((val) => {
      this._setValue(val);
    });
  }

  readonly listenable = new Listenable<[A, A]>();

  getValue() {
    return this.value;
  }

  setRemote(a: A) {
    // noinspection JSIgnoredPromiseFromCall
    this.setAsync(a);
  }

  setRemoteFn(val: (old: A) => A) {
    return this.setRemote(val(this.value));
  }

  setRemotePartial(val: Partial<A>) {
    return this.setRemoteFn((it) => {
      return {
        ...it,
        ...val,
      };
    });
  }

  setRemotePartialFn(val: (old: A) => Partial<A>) {
    return this.setRemotePartial(val(this.value));
  }

  private _setValue(a: A) {
    const old = this.value;
    this.value = a;
    this.listenable.notify(a, old);
  }
}
