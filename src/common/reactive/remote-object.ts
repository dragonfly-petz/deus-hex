import { Either } from 'fp-ts/Either';
import { Listenable } from './listener';
import { ReactiveVal } from './reactive-interface';
import { ReactiveFmapHelper } from './reactive-fmap';

export class RemoteObject<A extends object> implements ReactiveVal<A> {
  readonly fmap: ReactiveFmapHelper<A> = new ReactiveFmapHelper(this);

  constructor(
    private value: A,
    private setAsync: (val: A) => Promise<Either<string, boolean>>,
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

  async setRemote(a: A) {
    // noinspection JSIgnoredPromiseFromCall
    return this.setAsync(a);
  }

  async setRemoteFn(val: (old: A) => A) {
    return this.setRemote(val(this.value));
  }

  async setRemotePartial(val: Partial<A>) {
    return this.setRemoteFn((it) => {
      return {
        ...it,
        ...val,
      };
    });
  }

  async setRemotePartialFn(val: (old: A) => Partial<A>) {
    return this.setRemotePartial(val(this.value));
  }

  private _setValue(a: A) {
    const old = this.value;
    this.value = a;
    this.listenable.notify(a, old);
  }
}
