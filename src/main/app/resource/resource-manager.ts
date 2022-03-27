import path from 'path';
import { pipe } from 'fp-ts/function';
import { fromPromiseProperties, PromiseInner } from '../../../common/promise';
import { isNully } from '../../../common/null';
import { E } from '../../../common/fp-ts/fp';
import { EitherRight } from '../../../common/fp-ts/either';
import {
  mapObjectValues,
  mapObjectValuesStringKey,
} from '../../../common/object';
import { directoryExists, fileStat, getPathsInDir } from '../file/file-util';
import { FileType, fileTypes } from '../../../common/petz/file-types';
import { getFileInfo } from '../pe-files/pe-files-util';
import { taggedValue } from '../../../common/tagged-value';

export type ResourcesInfo = EitherRight<
  PromiseInner<ReturnType<ResourceManager['getResourcesInfo']>>
>;

export class ResourceManager {
  constructor() {}

  async getResourcesInfo(petzFolder: string | null) {
    if (isNully(petzFolder)) return E.left('No Petz folder set');
    const paths = mapObjectValues(fileTypes, (it) => {
      return path.join(petzFolder, ...it.pathSegments);
    });
    const res = await fromPromiseProperties(
      mapObjectValues(paths, async (it) =>
        pipe(
          await directoryExists(it),
          E.chain((exists) =>
            exists ? E.right(it) : E.left('Directory does not exist')
          )
        )
      )
    );

    const res2 = await fromPromiseProperties(
      mapObjectValuesStringKey(res, async (it, key) => {
        if (E.isLeft(it)) return it;
        return this.getResourcesInDir(it.right, key);
      })
    );
    return E.right(res2);
  }

  private async getResourcesInDir(dir: string, type: FileType) {
    const paths = await getPathsInDir(dir);
    if (E.isLeft(paths)) return paths;
    const promises = paths.right.map(async (filePath) => {
      const info = await this.getResourceInfo(filePath, type);
      return {
        path: filePath,
        info,
      };
    });
    return Promise.all(promises);
  }

  private async getResourceInfo(filePath: string, type: FileType) {
    const isRel = pipe(
      await fileStat(filePath),
      E.chainW((it) =>
        it.isDirectory()
          ? E.left(
              taggedValue(
                'invalidPath',
                'Directory - recursion is not supported'
              )
            )
          : E.right(true)
      ),
      E.chainW((_) =>
        fileTypes[type].extension !== path.extname(filePath)
          ? E.left(
              taggedValue(
                'invalidPath',
                `File did not match expected extension ${fileTypes[type]}`
              )
            )
          : E.right(true)
      )
    );
    if (E.isLeft(isRel)) return isRel;

    const fileInfo = await getFileInfo(filePath);
    if (E.isLeft(fileInfo)) {
      return taggedValue('error', fileInfo.left);
    }
    return taggedValue('success', fileInfo);
  }
}
