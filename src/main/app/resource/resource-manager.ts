import path from 'path';
import { identity, pipe } from 'fp-ts/function';
import { fromPromiseProperties, PromiseInner } from '../../../common/promise';
import { isNully } from '../../../common/null';
import { A, E, Either } from '../../../common/fp-ts/fp';
import {
  mapObjectValues,
  mapObjectValuesStringKey,
  unsafeObjectEntries,
} from '../../../common/object';
import { directoryExists, fileStat, getPathsInDir } from '../file/file-util';
import { FileType, fileTypes } from '../../../common/petz/file-types';
import {
  FileInfo,
  getFileInfo,
  parsePE,
  setBreedId,
} from '../pe-files/pe-files-util';
import { TaggedValue, taggedValue } from '../../../common/tagged-value';
import { snd, sortByNumeric } from '../../../common/array';
import { fsPromises } from '../util/fs-promises';
import { Result } from '../../../common/result';
import { isNever } from '../../../common/type-assertion';
import { FileWatcher } from '../file/file-watcher';

export type ResourceFolderInfo = PromiseInner<
  ReturnType<typeof getResourcesInDirImpl>
>;

export type ResourcesInfo = Record<FileType, ResourceFolderInfo>;

export class ResourceManager {
  constructor(private fileWatcher: FileWatcher) {}

  async getResourcesInfo(
    petzFolder: string | null
  ): Promise<Either<string, ResourcesInfo>> {
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
    const lefts = A.lefts(unsafeObjectEntries(res).map(snd));
    if (lefts.length > 0) {
      return E.left(lefts.join('\n'));
    }

    const res2 = await fromPromiseProperties(
      mapObjectValuesStringKey(res, async (it, key) => {
        if (E.isLeft(it)) {
          throw new Error(`Didn't expect left`);
        }
        return getResourcesInDirImpl(it.right, key);
      })
    );
    return E.right(res2);
  }

  async getResourceInfo(filePath: string, type: FileType) {
    return getResourceInfoImpl(filePath, type);
  }

  fixDuplicateIds(petzFolder: string, type: FileType) {
    return fixDuplicateIds(petzFolder, type, this.fileWatcher);
  }

  async saveWithBackup(filePath: string, data: Buffer) {
    const backupFile = `${filePath}.deusHexBackup`;
    const stat = await fileStat(backupFile);
    if (E.isLeft(stat)) {
      await fsPromises.copyFile(filePath, backupFile);
    }
    await this.fileWatcher.writeFileSuspendWatcher(filePath, data);

    if (E.isRight(stat)) {
      return E.right(
        `Saved - did not back up original because backup already existed`
      );
    }
    return E.right(`Saved and backed up original at ${backupFile}`);
  }
}

export interface ResourceInfoWithPath {
  fileName: string;
  path: string;
  info: ResourceInfo;
}

async function getResourcesInDirImpl(dir: string, type: FileType) {
  const paths = await getPathsInDir(dir);
  if (E.isLeft(paths)) return paths;
  const promises = paths.right.map(
    async (filePath): Promise<ResourceInfoWithPath> => {
      const info = await getResourceInfoImpl(filePath, type);
      return {
        fileName: path.basename(filePath),
        path: filePath,
        info,
      };
    }
  );
  const fileInfos = await Promise.all(promises);
  return E.right({
    path: dir,
    fileInfos,
  });
}

export type ResourceInfo = Either<
  TaggedValue<'invalidPath', string> | TaggedValue<'error', string>,
  TaggedValue<'success', FileInfo>
>;

export function resourceInfoToResult(resInfo: ResourceInfo): Result<FileInfo> {
  return pipe(
    resInfo,
    E.mapLeft((it) => {
      switch (it.tag) {
        case 'invalidPath':
          return `Invalid path - ${it.value}`;
        case 'error':
          return `Error - ${it.value}`;
        default:
          return isNever(it);
      }
    }),
    E.map((it) => {
      return it.value;
    })
  );
}

async function getResourceInfoImpl(
  filePath: string,
  type: FileType
): Promise<ResourceInfo> {
  const isRel = pipe(
    await fileStat(filePath),
    E.mapLeft((err) => {
      return taggedValue('invalidPath', `Could not stat: ${err}`);
    }),
    E.chainW((it) =>
      it.isDirectory()
        ? E.left(
            taggedValue('invalidPath', 'Directory - recursion is not supported')
          )
        : E.right(true)
    ),
    E.chainW((_) =>
      fileTypes[type].extension !== path.extname(filePath)
        ? E.left(
            taggedValue(
              'invalidPath',
              `File did not match expected extension ${fileTypes[type].extension}`
            )
          )
        : E.right(true)
    )
  );
  if (E.isLeft(isRel)) return isRel;
  const fileInfo = await getFileInfo(filePath);
  if (E.isLeft(fileInfo)) {
    return E.left(taggedValue('error', fileInfo.left));
  }
  return E.right(taggedValue('success', fileInfo.right));
}

async function fixDuplicateIds(
  petzFolder: string,
  type: FileType,
  fileWatcher: FileWatcher
) {
  const dir = path.join(petzFolder, ...fileTypes[type].pathSegments);
  const existingInfos = await getResourcesInDirImpl(dir, type);
  if (E.isLeft(existingInfos)) return existingInfos;
  const withInfo = existingInfos.right.fileInfos
    .filter(
      (it) =>
        (E.isLeft(it.info) && it.info.left.tag !== 'invalidPath') ||
        E.isRight(it.info)
    )

    .map((it) =>
      pipe(
        it.info,
        E.map((it2) => ({ info: it2.value, path: it.path }))
      )
    );
  const sequenced = A.sequence(E.Applicative)(withInfo);
  if (E.isLeft(sequenced)) {
    return E.left('Some files were not valid');
  }
  const idsAssigned = new Set<number>();
  const toReassign = new Array<{ info: FileInfo; path: string }>();
  for (const file of sequenced.right) {
    if (idsAssigned.has(file.info.rcInfo.breedId)) {
      toReassign.push(file);
    } else {
      idsAssigned.add(file.info.rcInfo.breedId);
    }
  }
  // should probably be int 16 or similar but this should be good enough
  const highestId = 30000;
  const pickNewId = () => {
    const asArr = Array.from(idsAssigned);
    sortByNumeric(asArr, identity);
    const from = asArr[0];
    for (let i = from; i < highestId; i++) {
      if (!idsAssigned.has(i)) {
        idsAssigned.add(i);
        return i;
      }
    }
    throw new Error(
      `Exhausted ids without finding a spare one (highest: ${highestId}`
    );
  };
  const promises = toReassign.map(async (file) => {
    const buf = await fsPromises.readFile(file.path);
    const pe = await parsePE(buf);
    const newId = pickNewId();
    await setBreedId(pe, newId);
    await fileWatcher.writeFileSuspendWatcher(
      file.path,
      Buffer.from(pe.generate())
    );
  });

  await Promise.all(promises);
  return E.right(`Assigned ${toReassign.length} new ids`);
}
