import { assert } from '../assert';
import { Disposer } from '../disposable';
import { isNotNully, isNully, nullable } from '../null';
import { tuple } from '../array';

export type ChangeListener<A> = (newVal: A, old: A) => void;

export function toChangeVal<A>(a: A) {
  return tuple(a, a);
}

export class Listenable<A extends unknown[]> {
  private readonly mListeners = new Set<(...a: [...A]) => void>();

  get listenersSize() {
    return this.mListeners.size;
  }

  listen(listener: (...a: A) => void, callOnListen?: () => A) {
    this.mListeners.add(listener);
    if (isNotNully(callOnListen)) {
      listener(...callOnListen());
    }
    return () => {
      this.mListeners.delete(listener);
    };
  }

  listenWithOnChange(listener: (...a: A) => void, onChange: () => void) {
    const disposer = this.listen(listener);
    onChange();
    return () => {
      disposer();
      onChange();
    };
  }

  listenWithSubscription(
    listener: (...a: A) => void,
    sub: () => Disposer,
    callOnListen?: () => A
  ) {
    const ret = this.listenWithOnChange(listener, () =>
      this.manageSubscription(sub)
    );
    if (isNotNully(callOnListen)) {
      listener(...callOnListen());
    }
    return ret;
  }

  private subDisposer = nullable<Disposer>();

  manageSubscription(sub: () => Disposer) {
    if (this.listenersSize > 0) {
      if (isNully(this.subDisposer)) {
        this.subDisposer = sub();
      }
      return;
    }
    if (isNotNully(this.subDisposer)) {
      this.subDisposer();
      this.subDisposer = null;
    }
  }

  // use a lamda so we can pass this elsewhere more easily
  readonly notify = (...a: A) => {
    for (const listener of this.mListeners) {
      listener(...a);
    }
  };

  assertHasListeners() {
    assert(this.listenersSize > 0, 'Expected listenable to have > 0 listeners');
  }
}
