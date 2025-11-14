import { Either } from 'fp-ts/Either';
import React, { useEffect, useState } from 'react';
import { isNully, nullable } from '../../common/null';
import { E } from '../../common/fp-ts/fp';
import { throwRejectionK } from '../../common/promise';

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

export const renderNullableElse = <A,>(
  value: A | null | undefined,
  render: RenderFunction<A>,
  renderElse: RenderFunction
) => {
  if (isNully(value)) return renderElse();
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

export const renderIf = (condition: boolean, func: RenderFunction) => {
  if (condition) {
    return func();
  }
  return null;
};

export const emptyComponent = () => {
  return null;
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
    throwRejectionK(async () => {
      setVal(await value);
    });
  }, [value]);
  return renderNullable(val, render);
};

export function renderLineBreaks(str: string) {
  const broken = str.split(/\r?\n|\r/g);
  return (
    <>
      {broken.map((it, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={idx}>
          {it}
          <br />
        </React.Fragment>
      ))}
    </>
  );
}
