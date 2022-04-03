import { ChangeListener, Listenable, toChangeVal } from './listener';
import { fmapHelper } from './reactive-fmap';
import { ReactiveVal } from './reactive-interface';
import { EqualityCheck } from '../equality';
import { Disposer } from '../disposable';

export class ReactiveNode<A> implements ReactiveVal<A> {
  private readonly listenable = new Listenable<[A, A]>();

  constructor(private value: A) {}

  listen(fn: ChangeListener<A>, callOnListen: boolean): Disposer {
    return this.listenable.listen(
      fn,
      callOnListen ? () => toChangeVal(this.getValue()) : undefined
    );
  }

  getValue() {
    return this.value;
  }

  setValue(val: A) {
    const old = this.value;
    this.value = val;
    this.listenable.notify(val, old);
  }

  setValueFn(val: (old: A) => A) {
    return this.setValue(val(this.value));
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
