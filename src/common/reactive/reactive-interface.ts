import { ChangeListener } from './listener';
import { EqualityCheck } from '../equality';
import { Disposer } from '../disposable';

export interface FmapAble<A> {
  fmap<B>(fn: (a: A) => B, equalityCheck: EqualityCheck<B>): ReactiveVal<B>;

  fmapStrict<B>(fn: (a: A) => B, debounce?: number): ReactiveVal<B>;

  fmapDeep<B>(fn: (a: A) => B): ReactiveVal<B>;
}

export interface ReactiveVal<A> extends FmapAble<A> {
  listen(fn: ChangeListener<A>, callOnListen: boolean): Disposer;

  getValue(): A;
}

export type ReactiveValInner<A extends ReactiveVal<any>> =
  A extends ReactiveVal<infer B> ? B : never;
