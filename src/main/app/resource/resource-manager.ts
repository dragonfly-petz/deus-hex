import path from 'path';
import { fromPromiseProperties, PromiseInner } from '../../../common/promise';
import { isNully } from '../../../common/null';
import { A, E } from '../../../common/fp-ts/fp';
import { EitherRight } from '../../../common/fp-ts/either';
import { mapObjectValues, unsafeObjectEntries } from '../../../common/object';
import { directoryExists } from '../file/file-util';
import { snd } from '../../../common/array';

export type ResourcesInfo = EitherRight<
  PromiseInner<ReturnType<ResourceManager['getResourcesInfo']>>
>;

function getResourcePaths(dir: string) {
  return {
    clothes: path.join(dir, 'Resource', 'Clothes'),
    dogz: path.join(dir, 'Resource', 'Dogz'),
    catz: path.join(dir, 'Resource', 'Catz'),
  };
}

export class ResourceManager {
  constructor() {}

  async getResourcesInfo(petzFolder: string | null) {
    if (isNully(petzFolder)) return E.left('No Petz folder set');
    const paths = getResourcePaths(petzFolder);
    const res = await fromPromiseProperties(
      mapObjectValues(paths, (it) => directoryExists(it))
    );
    const lefts = A.lefts(unsafeObjectEntries(res).map(snd));
    if (lefts.length > 0) {
      return E.left(lefts.join('\n'));
    }
    return E.right(paths);
  }
}
