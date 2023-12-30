import { CSSProperties } from 'react';
import {
  mapObjectValues,
  objectEntries,
  unsafeObjectEntries,
  unsafeObjectFromEntries,
} from '../../common/object';
import { isNully } from '../../common/null';
import { Listenable } from '../../common/reactive/listener';

type StyleType = string | null;

export class StyleVarHelper<A extends Record<string, StyleType>> {
  readonly listenable = new Listenable<[A]>();

  private currentStyle: A;

  constructor(private defaultStyle: A, scssExport: Record<string, string>) {
    this.currentStyle = { ...defaultStyle };
    const defs = unsafeObjectEntries(defaultStyle);
    if (defs.length !== unsafeObjectEntries(defaultStyle).length) {
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

  updateCurrentStyle(toSet: Partial<A>) {
    this.currentStyle = { ...this.currentStyle };
    for (const [key, val] of unsafeObjectEntries(toSet)) {
      this.currentStyle[key] = val as any;
    }
    this.listenable.notify(this.currentStyle);
  }

  getDefaultStyle() {
    return this.defaultStyle;
  }

  getCurrentStyle() {
    return this.currentStyle;
  }

  toStyle(style: Partial<A>): CSSProperties {
    return unsafeObjectFromEntries(
      unsafeObjectEntries(style).map(([key, val]) => {
        return [`--${String(key)}`, val];
      })
    );
  }

  setOnHtml(el: HTMLElement, style: Partial<A>) {
    const asStyle = this.toStyle(style);
    for (const [key, val] of objectEntries(asStyle)) {
      el.style.setProperty(key, isNully(val) ? null : String(val));
    }
  }

  toRecord<B extends Record<string, Partial<A>>>(
    b: B
  ): Record<keyof B, CSSProperties> {
    return mapObjectValues(b, (it) => this.toStyle(it));
  }

  toProxyStyle(proxyDef: Partial<Record<keyof A, keyof A>>): CSSProperties {
    const proxied: Partial<A> = mapObjectValues(
      proxyDef,
      (val) => this.defaultStyle[val as any]
    ) as any;
    return this.toStyle(proxied);
  }

  toRecordProxy<B extends Record<string, Partial<Record<keyof A, keyof A>>>>(
    b: B
  ): Record<keyof B, CSSProperties> {
    return mapObjectValues(b, (it: Partial<Record<keyof A, keyof A>>) => {
      return this.toProxyStyle(it);
    });
  }

  px(val: number) {
    return `${val}px`;
  }
}
