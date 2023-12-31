import Tippy, { TippyProps } from '@tippyjs/react';
import React from 'react';
import style from './Tooltip.module.scss';

type ExposedTippyProps = Pick<
  TippyProps,
  | 'content'
  | 'disabled'
  | 'interactive'
  | 'placement'
  | 'hideOnClick'
  | 'onHidden'
  | 'followCursor'
>;

export interface TooltipProps extends ExposedTippyProps {
  // the child of Tippy has to be something that accepts refs
  children: React.ReactElement;
}

const debugTooltips = false;
const debugTooltipProps = debugTooltips
  ? {
      showOnCreate: true,
      trigger: 'click',
      interactive: true,
      hideOnClick: false,
    }
  : {};

export function Tooltip({ children, content, ...rest }: TooltipProps) {
  const wrappedContent = <div className={style.main}>{content}</div>;
  return (
    <Tippy
      content={wrappedContent}
      {...rest}
      {...debugTooltipProps}
      appendTo={document.body}
    >
      {children}
    </Tippy>
  );
}
