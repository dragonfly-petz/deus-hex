import { Either } from 'fp-ts/Either';
import { ChangeListener, Listenable, toChangeVal } from './listener';
import { ReactiveVal } from './reactive-interface';
import { EqualityCheck } from '../equality';
import { fmapHelper } from './reactive-fmap';
import { Disposable, Disposer } from '../disposable';

export class RemoteObject<A extends object>
  implements ReactiveVal<A>, Disposable
{
  private readonly listenable = new Listenable<[A, A]>();

  readonly dispose: Disposer;

  constructor(
    private value: A,
    private setAsync: (val: A) => Promise<Either<string, boolean>>,
    private srcEmitter: Listenable<[A]>
  ) {
    this.dispose = this.srcEmitter.listen((val) => {
      this._setValue(val);
    });
  }

  listen(fn: ChangeListener<A>, callOnListen: boolean): Disposer {
    return this.listenable.listen(
      fn,
      callOnListen ? () => toChangeVal(this.getValue()) : undefined
    );
  }

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

  fmap<B>(fn: (a: A) => B, equalityCheck: EqualityCheck<B>): ReactiveVal<B> {
    return fmapHelper.fmap(this, fn, equalityCheck);
  }

  fmapStrict<B>(fn: (a: A) => B): ReactiveVal<B> {
    return fmapHelper.fmapStrict(this, fn);
  }

  fmapDeep<B>(fn: (a: A) => B): ReactiveVal<B> {
    return fmapHelper.fmapDeep(this, fn);
  }
}
