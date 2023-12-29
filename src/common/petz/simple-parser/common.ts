import { E } from '../../fp-ts/fp';

export function pInt(val: string) {
  const asNum = parseInt(val, 10);
  if (Number.isNaN(asNum)) {
    return E.left(`Expected an integer, got ${val}`);
  }
  return E.right(asNum);
}

export function nestErr(val: E.Left<string>, err: string) {
  return E.left(`${err}: ${val.left}`);
}
