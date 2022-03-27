import style from './layout.module.scss';
import { IconDef } from '../framework/Icon';
import { Button } from '../framework/Button';
import { Either } from '../../common/fp-ts/fp';

export interface ActionDef {
  key: string;
  action: () => Promise<Either<string, unknown>>;
  label?: string;
  icon?: IconDef;
  tooltip: string;
}

export const ActionBar = ({ actions }: { actions: ActionDef[] }) => {
  return (
    <div className={style.actions}>
      {actions.map((action) => {
        return (
          <Button
            onClick={action.action}
            key={action.key}
            icon={action.icon}
            tooltip={action.tooltip}
            label={action.label}
          />
        );
      })}
    </div>
  );
};
