import { ReactNode } from 'react';
import style from './Panel.module.scss';

export function Panel({ children }: { children: ReactNode }) {
  return <div className={style.panel}>{children}</div>;
}

export function PanelHeader({ children }: { children: ReactNode }) {
  return <div className={style.header}>{children}</div>;
}

export function PanelBody({ children }: { children: ReactNode }) {
  return <div className={style.body}>{children}</div>;
}

export function PanelButtons({ children }: { children: ReactNode }) {
  return <div className={style.buttons}>{children}</div>;
}
