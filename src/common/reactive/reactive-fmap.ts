import { Listenable } from './listener';
import {
  deepEqualityCheck,
  EqualityCheck,
  strictEqualityCheck,
} from '../equality';
import { ReactiveVal } from './reactive-interface';
import { Disposable } from '../disposable';

class ReactiveFmap<A, B> implements ReactiveVal<B>, Disposable {
  readonly listenable = new Listenable<[B, B]>();

  readonly fmap: ReactiveFmapHelper<B> = new ReactiveFmapHelper(this);

  private value: B;

  private readonly disposer: () => void;

  constructor(
    private readonly source: ReactiveVal<A>,
    private readonly fn: (a: A) => B,
    private readonly equalityCheck: EqualityCheck<B>
  ) {
    this.value = fn(source.getValue());
    this.disposer = source.listenable.listen((it) => this.updateValue(it));
  }

  private updateValue(a: A) {
    const oldVal = this.value;
    const newVal = this.fn(a);
    if (this.equalityCheck(this.value, newVal)) {
      return;
    }
    this.value = newVal;
    this.listenable.notify(newVal, oldVal);
  }

  getValue(): B {
    return this.value;
  }

  dispose() {
    this.disposer();
  }
}

export class ReactiveFmapHelper<A> {
  constructor(private readonly source: ReactiveVal<A>) {}

  strict<B>(fn: (a: A) => B) {
    return new ReactiveFmap(this.source, fn, strictEqualityCheck);
  }

  deep<B>(fn: (a: A) => B) {
    return new ReactiveFmap(this.source, fn, deepEqualityCheck);
  }
}
