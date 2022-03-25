export type ChangeListener<A> = (newVal: A, old: A) => void;

export class Listenable<A extends unknown[]> {
  private readonly mListeners = new Set<(...a: [...A]) => void>();

  listen(listener: (...a: A) => void) {
    this.mListeners.add(listener);
    return () => {
      this.mListeners.delete(listener);
    };
  }

  // use a lamda so we can pass this elsewhere more easily
  readonly notify = (...a: A) => {
    for (const listener of this.mListeners) {
      listener(...a);
    }
  };
}
