import { CSSProperties } from 'react';
import {
  mapObjectValues,
  objectEntries,
  unsafeObjectEntries,
  unsafeObjectFromEntries,
} from '../../common/object';
import { isNully } from '../../common/null';

type StyleType = string | null;

export class StyleVarHelper<A extends Record<string, StyleType>> {
  constructor(private styleDef: A, scssExport: Record<string, string>) {
    const defs = unsafeObjectEntries(styleDef);
    if (defs.length !== unsafeObjectEntries(styleDef).length) {
      throw new Error(
        `Expected style defs to match number of keys in scssExport`
      );
    }
    for (const [key] of defs) {
      if (scssExport[key] !== key) {
        throw new Error(`Couldn't find scss export for style def key ${key}`);
      }
    }
  }

  toStyle(style: Partial<A>): CSSProperties {
    return unsafeObjectFromEntries(
      unsafeObjectEntries(style).map(([key, val]) => {
        return [`--${key}`, val];
      })
    );
  }

  setOnHtml(el: HTMLElement, style: Partial<A>) {
    const asStyle = this.toStyle(style);
    for (const [key, val] of objectEntries(asStyle)) {
      el.style.setProperty(key, isNully(val) ? null : `${val}`);
    }
  }

  toRecord<B extends Record<string, Partial<A>>>(
    b: B
  ): Record<keyof B, CSSProperties> {
    return mapObjectValues(b, (it) => this.toStyle(it));
  }

  toRecordProxy<B extends Record<string, Partial<Record<keyof A, keyof A>>>>(
    b: B
  ): Record<keyof B, CSSProperties> {
    return mapObjectValues(b, (it: Partial<Record<keyof A, keyof A>>) => {
      const proxied: Partial<A> = mapObjectValues(
        it,
        (val) => this.styleDef[val as any]
      ) as any;
      return this.toStyle(proxied);
    });
  }
}
