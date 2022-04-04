import { ReactNode } from 'react';
import { isNotNully } from './null';

export function classNames(...arr: Array<string | null | undefined>) {
  return arr.filter(isNotNully).join(' ');
}

export interface HasChildren {
  children: ReactNode;
}

export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement,
  type: K,
  listener: (ev: HTMLElementEventMap[K]) => void
) {
  element.addEventListener(type, listener);
  return () => {
    element.removeEventListener(type, listener);
  };
}

export function addEventListenerDocument<K extends keyof DocumentEventMap>(
  element: Document,
  type: K,
  listener: (ev: DocumentEventMap[K]) => void
) {
  element.addEventListener(type, listener);
  return () => {
    element.removeEventListener(type, listener);
  };
}
