import { ReactNode } from 'react';
import style from './Button.module.scss';
import { classNames } from '../../common/react';
import { Icon, IconDef, IconProps, isIconDef } from './Icon';
import { renderNullable } from './render';
import { Tooltip } from './Tooltip';
import { isNully } from '../../common/null';

const sizeClasses = {
  normal: style.normal,
  large: style.large,
} as const;
export type ButtonSize = keyof typeof sizeClasses;
export const Button = ({
  label,
  onClick,
  active = false,
  size = 'normal',
  icon,
  tooltip,
}: {
  label?: string;
  onClick: () => void;
  active?: boolean;
  size?: ButtonSize;
  icon?: IconDef | IconProps;
  tooltip?: ReactNode;
}) => {
  return (
    <Tooltip content={tooltip} disabled={isNully(tooltip)}>
      <button
        className={classNames(
          style.main,
          active ? style.active : null,
          sizeClasses[size],
          isNully(label) ? style.iconOnly : null
        )}
        onClick={onClick}
        type="button"
      >
        {renderNullable(icon, (i) => {
          const props = isIconDef(i) ? { icon: i } : i;
          return (
            <div className={style.icon}>
              <Icon {...props} />
            </div>
          );
        })}
        {renderNullable(label, (it) => (
          <div className={style.label}>{it}</div>
        ))}
      </button>
    </Tooltip>
  );
};
