import { useEffect } from 'react';
import style from './layout.module.scss';
import { IconDef } from '../framework/Icon';
import { Button } from '../framework/Button';
import { useReactiveVal } from '../reactive-state/reactive-hooks';
import { ReactiveNode } from '../../common/reactive/reactive-node';
import { uuidV4 } from '../../common/uuid';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { Option } from '../../common/fp-ts/fp';

export interface ActionDef {
  key: string;
  action: () => Promise<unknown>;
  label?: string;
  icon?: IconDef;
  tooltip: string;
  disable?: ReactiveVal<Option<string>> | string;
}

export type ActionsNode = ReactiveNode<Map<string, ActionDef>>;

export function useAddActions(
  actionsNode: ActionsNode,
  getActions: (actions: ActionDef[]) => void
) {
  useEffect(() => {
    const actions = new Array<ActionDef>();
    getActions(actions);
    const actionsToAdd = Array<[string, ActionDef]>();
    for (const action of actions) {
      const id = uuidV4();
      actionsToAdd.push([id, action]);
    }
    actionsNode.setValueFn((it) => {
      for (const act of actionsToAdd) {
        it.set(act[0], act[1]);
      }
      return it;
    });
    return () => {
      actionsNode.setValueFn((it) => {
        for (const act of actionsToAdd) {
          it.delete(act[0]);
        }
        return it;
      });
    };
  }, [actionsNode, getActions]);
}

export function ActionBar({ actions }: { actions: ActionsNode }) {
  const acts = Array.from(useReactiveVal(actions).values());
  return (
    <div className={style.actions}>
      {acts.map((action) => {
        return (
          <Button
            onClick={action.action}
            key={action.key}
            icon={action.icon}
            tooltip={action.tooltip}
            label={action.label}
            disable={action.disable}
          />
        );
      })}
    </div>
  );
}
