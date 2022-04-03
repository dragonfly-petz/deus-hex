import React from 'react';
import { HasChildren } from '../../../common/react';
import style from './form.module.scss';

export const FormItem = ({ children }: HasChildren) => {
  return <div className={style.item}>{children}</div>;
};

export const FormInput = ({ children }: HasChildren) => {
  return <div className={style.input}>{children}</div>;
};

export const FormLabel = ({ children }: HasChildren) => {
  return <div className={style.label}>{children}</div>;
};
