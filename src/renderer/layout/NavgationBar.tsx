import { FunctionalComponent } from '../framework/render';
import style from './layout.module.scss';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { Button } from '../framework/Button';
import { ReactiveNode } from '../../common/reactive/reactive-node';

export interface NavigationDef<A extends string, Deps extends object> {
  names: ReadonlyArray<A>;
  node: ReactiveNode<A>;
  items: Record<A, NavigationItem<Deps>>;
}

interface NavigationItem<Deps extends object> {
  name: string;
  Content: FunctionalComponent<Deps>;
}

export const Navigation = <A extends string>({
  navigationNames,
  items,
  node,
}: {
  navigationNames: ReadonlyArray<A>;
  items: Record<A, NavigationItem<any>>;
  node: ReactiveNode<A>;
}) => {
  const currentName = useReactiveVal(node);

  return (
    <div className={style.navigation}>
      {navigationNames.map((name) => {
        const def = items[name];
        return (
          <Button
            key={name}
            label={def.name}
            active={name === currentName}
            onClick={() => {
              node.setValue(name);
            }}
          />
        );
      })}
    </div>
  );
};
