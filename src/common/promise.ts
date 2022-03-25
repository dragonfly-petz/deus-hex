class RunAsyncError extends Error {}

export type PromiseInner<A extends Promise<any>> = A extends Promise<infer B>
  ? B
  : never;

export function throwRejection(block: () => Promise<void>) {
  block().catch((e) => {
    if (e instanceof Error) {
      throw e;
    }
    throw new RunAsyncError(`Promise was rejected with ${e}`);
  });
}

export type TrackablePromiseState<A> =
  | {
      tag: 'pending';
    }
  | {
      tag: 'resolved';
      value: A;
    }
  | {
      tag: 'rejected';
      value: unknown;
    };

export class TrackablePromise<A = void> {
  private mState: TrackablePromiseState<A> = { tag: 'pending' };

  readonly promise: Promise<A>;

  constructor(originalPromise: Promise<A>) {
    this.promise = originalPromise.then(
      (a) => {
        this.mState = {
          tag: 'resolved',
          value: a,
        };
        return a;
      },
      (err) => {
        this.mState = {
          tag: 'rejected',
          value: err,
        };
        throw err;
      }
    );
  }

  get result() {
    if (this.mState.tag === 'resolved') {
      return this.mState;
    }
    return null;
  }

  get isPending() {
    return this.mState.tag === 'pending';
  }

  get isResolved() {
    return this.mState.tag === 'resolved';
  }

  get isRejected() {
    return this.mState.tag === 'rejected';
  }
}

export class Deferred<A = void> {
  readonly trackablePromise: TrackablePromise<A>;

  private resolveInner?: (a: A) => void;

  private rejectInner?: (err: unknown) => void;

  constructor() {
    const promise = new Promise<A>((resolve, reject) => {
      this.resolveInner = resolve;
      this.rejectInner = reject;
    });
    this.trackablePromise = new TrackablePromise(promise);
  }

  get result() {
    return this.trackablePromise.result;
  }

  get promise() {
    return this.trackablePromise.promise;
  }

  resolve(a: A) {
    this.resolveInner!(a);
  }

  reject(err: unknown) {
    this.rejectInner!(err);
  }
}
