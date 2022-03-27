import { ReactNode } from 'react';
import style from './Panel.module.scss';

export const Panel = ({ children }: { children: ReactNode }) => {
  return <div className={style.panel}>{children}</div>;
};
export const PanelHeader = ({ children }: { children: ReactNode }) => {
  return <div className={style.header}>{children}</div>;
};
export const PanelBody = ({ children }: { children: ReactNode }) => {
  return <div className={style.body}>{children}</div>;
};
export const PanelButtons = ({ children }: { children: ReactNode }) => {
  return <div className={style.buttons}>{children}</div>;
};
