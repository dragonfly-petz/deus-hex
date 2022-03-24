import { CSSProperties } from 'react';
import { objectEntries, unsafeObjectFromEntries } from '../../common/object';

export type StyleVars<A extends PropertyKey> = Record<A, string>;

export function toStyle(styleVars: StyleVars<any>): CSSProperties {
  return unsafeObjectFromEntries(
    objectEntries(styleVars).map(([key, val]) => {
      return [`--${key}`, val];
    })
  );
}
