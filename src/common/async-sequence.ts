import { isNully, nullable } from './null';

export class AsyncSequence {
  private lastPromise = nullable<Promise<any>>();

  async sequence<A>(block: () => Promise<A>): Promise<A> {
    if (isNully(this.lastPromise)) {
      this.lastPromise = block();
      return this.lastPromise;
    }

    this.lastPromise = this.lastPromise.then(() => {
      return block();
    });
    return this.lastPromise;
  }
}
