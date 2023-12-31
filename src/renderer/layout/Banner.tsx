import { ReactNode } from 'react';
import style from './Banner.module.scss';
import { globalSh } from '../framework/global-style-var';

const kindStyles = globalSh.toRecordProxy({
  info: { localVar1: 'infoBgColor' },
  warn: { localVar1: 'warnBgColor' },
  error: { localVar1: 'errorBgColor' },
  success: { localVar1: 'successBgColor' },
});

export function Banner({
  children,
  kind,
}: {
  children: ReactNode;
  kind: keyof typeof kindStyles;
}) {
  return (
    <div style={kindStyles[kind]} className={style.banner}>
      {children}
    </div>
  );
}

export function BannerBody({ children }: { children: ReactNode }) {
  return <div className={style.body}>{children}</div>;
}

export function BannerButtons({ children }: { children: ReactNode }) {
  return <div className={style.buttons}>{children}</div>;
}
