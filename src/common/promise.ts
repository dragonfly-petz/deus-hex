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
