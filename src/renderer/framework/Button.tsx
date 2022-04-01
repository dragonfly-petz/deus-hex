import { ReactNode } from 'react';
import { isString } from 'fp-ts/string';
import { pipe } from 'fp-ts/function';
import style from './Button.module.scss';
import { classNames } from '../../common/react';
import { Icon, IconDef, IconProps, isIconDef } from './Icon';
import { FunctionalComponent, renderNullable } from './render';
import { Tooltip } from './Tooltip';
import { isNully } from '../../common/null';
import { ReactiveVal } from '../../common/reactive/reactive-interface';
import { O, Option } from '../../common/fp-ts/fp';
import { useReactiveOrConstantOption } from '../reactive-state/reactive-hooks';

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
  disable,
}: {
  label?: string | FunctionalComponent;
  onClick: () => void;
  active?: boolean;
  size?: ButtonSize;
  icon?: IconDef | IconProps;
  tooltip?: ReactNode;
  disable?: ReactiveVal<Option<string>> | string;
}) => {
  const disableVal = useReactiveOrConstantOption(disable);
  const disabled = O.isSome(disableVal);
  const tooltipContent = pipe(
    disableVal,
    O.getOrElseW(() => tooltip)
  );

  return (
    <Tooltip content={tooltipContent} disabled={isNully(tooltip)}>
      <div className={style.wrapper}>
        <button
          disabled={disabled}
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
          {renderNullable(label, (Label) => {
            return (
              <div className={style.label}>
                {isString(Label) ? Label : <Label />}
              </div>
            );
          })}
        </button>
      </div>
    </Tooltip>
  );
};
