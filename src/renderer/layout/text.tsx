import { ReactNode } from 'react';
import style from './text.module.scss';

export function Heading({ children }: { children: ReactNode }) {
  return <div className={style.heading}>{children}</div>;
}
