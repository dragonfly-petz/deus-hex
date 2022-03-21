import { Either } from 'fp-ts/Either';
import { useEffect, useState } from 'react';
import { isNully, nullable } from '../../common/null';
import { E } from '../../common/fp-ts/fp';
import { throwRejection } from '../../common/promise';

export type RenderFunction<A = void> = (input: A) => JSX.Element | null;
export type FunctionalComponent<Props extends object = object> = (
  props: Props
) => JSX.Element | null;

export const renderNullable = <A,>(
  value: A | null | undefined,
  render: RenderFunction<A>
) => {
  if (isNully(value)) return null;
  return render(value);
};

export const renderEither = <A, B>(
  value: Either<A, B>,
  renderA: RenderFunction<A>,
  renderB: RenderFunction<B>
) => {
  if (E.isLeft(value)) {
    return renderA(value.left);
  }
  return renderB(value.right);
};

export const RenderAsync = <A,>({
  render,
  value,
}: {
  value: Promise<A>;
  render: RenderFunction<A>;
}) => {
  const [val, setVal] = useState(nullable<A>());
  useEffect(() => {
    throwRejection(async () => {
      setVal(await value);
    });
  }, [value]);
  return renderNullable(val, render);
};
