import { Listenable } from './listener';
import type { ReactiveFmapHelper } from './reactive-fmap';

export interface ReactiveVal<A> {
  readonly listenable: Listenable<[A, A]>;

  readonly fmap: ReactiveFmapHelper<A>;

  getValue(): A;
}
