import { Listenable } from './listener';
import { ReactiveFmapHelper } from './reactive-fmap';
import { ReactiveVal } from './reactive-interface';

export class ReactiveNode<A> implements ReactiveVal<A> {
  readonly fmap: ReactiveFmapHelper<A> = new ReactiveFmapHelper(this);

  readonly listenable = new Listenable<[A, A]>();

  constructor(private value: A) {}

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
}
