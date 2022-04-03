import { unsafeObjectEntries, unsafeObjectFromEntries } from './object';
import { Disposer } from './disposable';

class RunAsyncError extends Error {}

export type PromiseInner<A extends Promise<any>> = A extends Promise<infer B>
  ? B
  : never;

export function throwRejection(prom: Promise<unknown>) {
  prom.catch((e) => {
    if (e instanceof Error) {
      throw e;
    }
    throw new RunAsyncError(`Promise was rejected with ${e}`);
  });
}

export function throwRejectionK(block: () => Promise<unknown>) {
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

export async function fromPromiseProperties<
  A extends Record<PropertyKey, Promise<any>>
>(
  object: A
): Promise<{
  [P in keyof A]: PromiseInner<A[P]>;
}> {
  const objectEntries = unsafeObjectEntries(object);
  const results = await Promise.all(objectEntries.map((it) => it[1]));
  return unsafeObjectFromEntries(
    objectEntries.map(([k], idx) => {
      return [k, results[idx]];
    })
  ) as any;
}

export async function bracketAsync<A>(
  acquire: () => Disposer,
  block: () => Promise<A>
) {
  const dispose = acquire();
  try {
    return await block();
  } finally {
    dispose();
  }
}

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
