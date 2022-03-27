import { ReactNode } from 'react';
import style from './text.module.scss';

export const Heading = ({ children }: { children: ReactNode }) => {
  return <div className={style.heading}>{children}</div>;
};
