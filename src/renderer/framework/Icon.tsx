import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import solidIcons, { fas } from '@fortawesome/free-solid-svg-icons';
import { isString } from 'fp-ts/string';
import style from './Icon.module.scss';

export type IconDef = keyof typeof solidIcons;

export function isIconDef(val: unknown): val is IconDef {
  return isString(val);
}

export interface IconProps {
  icon: IconDef;
}

export function Icon({ icon }: IconProps) {
  return (
    <div className={style.icon}>
      <FontAwesomeIcon icon={fas[icon]} />
    </div>
  );
}
