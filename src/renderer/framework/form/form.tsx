import React, { ReactNode } from 'react';
import { HasChildren } from '../../../common/react';
import style from './form.module.scss';
import { ReactiveVal } from '../../../common/reactive/reactive-interface';
import { renderEither, renderNullable } from '../render';
import { Either } from '../../../common/fp-ts/fp';
import { useReactiveVal } from '../../reactive-state/reactive-hooks';

export function FormItem({ children }: HasChildren) {
  return <div className={style.item}>{children}</div>;
}

export function FormInput({ children }: HasChildren) {
  return <div className={style.input}>{children}</div>;
}
export const FormError = ({
  message,
}: {
  message: ReactiveVal<Either<ReactNode, unknown>>;
}) => {
  const res = useReactiveVal(message);
  return renderEither(
    res,
    (mess) => <div className={style.error}>{mess}</div>,
    () => null
  );
};
export const FormWarning = ({
  message,
}: {
  message: ReactiveVal<ReactNode | null>;
}) => {
  const res = useReactiveVal(message);

  return renderNullable(res, (mess) => (
    <div className={style.warn}>{mess}</div>
  ));
};

export function FormLabel({ children }: HasChildren) {
  return <div className={style.label}>{children}</div>;
}
