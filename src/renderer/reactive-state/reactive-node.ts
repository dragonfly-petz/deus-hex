export type ReactiveNodeListener<A> = (newVal: A, old: A) => void;

export class ReactiveNode<A> {
  private listeners = new Set<ReactiveNodeListener<A>>();

  constructor(private value: A) {}

  getValue() {
    return this.value;
  }

  setValue(val: A) {
    const old = this.value;
    this.value = val;
    for (const listener of this.listeners) {
      listener(val, old);
    }
  }

  listen(listener: ReactiveNodeListener<A>) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
