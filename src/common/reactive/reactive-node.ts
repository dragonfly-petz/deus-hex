import { Listenable } from './listener';

export interface ReactiveVal<A> {
  readonly listenable: Listenable<[A, A]>;

  getValue(): A;
}

export class ReactiveNode<A> implements ReactiveVal<A> {
  constructor(private value: A) {}

  readonly listenable = new Listenable<[A, A]>();

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
