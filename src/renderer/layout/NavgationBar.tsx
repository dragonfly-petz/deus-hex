import { isString } from 'fp-ts/string';
import { FunctionalComponent } from '../framework/render';
import style from './layout.module.scss';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { Button } from '../framework/Button';
import { ReactiveNode } from '../../common/reactive/reactive-node';

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
}: {
  navigationNames: ReadonlyArray<A>;
  items: Record<A, NavigationItem<Deps, LabelDeps>>;
  node: ReactiveNode<A>;
  labelDeps: LabelDeps;
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
          <Button
            key={name}
            label={label}
            active={name === currentName}
            onClick={() => {
              node.setValue(name);
            }}
          />
        );
      })}
    </div>
  );
}
