import { isNotNully } from './null';

export function classNames(...arr: Array<string | null | undefined>) {
  return arr.filter(isNotNully).join(' ');
}
