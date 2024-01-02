import { isString } from 'fp-ts/string';
import { Fragment } from 'react';
import { FunctionalComponent } from '../framework/render';
import style from './layout.module.scss';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { Button } from '../framework/Button';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { isNotNully } from '../../common/null';

export interface NavigationDef<
  A extends string,
  Deps extends object,
  LabelDeps extends object = Record<string, never>
> {
  names: ReadonlyArray<A>;
  node: ReactiveNode<A>;
  items: Record<A, NavigationItem<Deps, LabelDeps>>;
}

interface NavigationItem<
  Deps extends object,
  LabelDeps extends object = Record<string, never>
> {
  name: string | FunctionalComponent<LabelDeps>;
  Content: FunctionalComponent<Deps>;
}

export function Navigation<
  A extends string,
  Deps extends object,
  LabelDeps extends object = Record<string, never>
>({
  navigationNames,
  items,
  node,
  labelDeps,
  SuffixItem,
}: {
  navigationNames: ReadonlyArray<A>;
  items: Record<A, NavigationItem<Deps, LabelDeps>>;
  node: ReactiveNode<A>;
  labelDeps: LabelDeps;
  SuffixItem?: FunctionalComponent<LabelDeps & { name: A; currentName: A }>;
}) {
  const currentName = useReactiveVal(node);

  return (
    <div className={style.navigation}>
      {navigationNames.map((name) => {
        const def = items[name];
        const label = isString(def.name)
          ? () => <>{name}</>
          : () => <def.name {...labelDeps} />;
        return (
          <Fragment key={name}>
            <Button
              label={label}
              active={name === currentName}
              onClick={() => {
                node.setValue(name);
              }}
            />
            {isNotNully(SuffixItem) ? (
              <SuffixItem
                {...labelDeps}
                name={name}
                currentName={currentName}
              />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
