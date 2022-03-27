import { pipe } from 'fp-ts/function';
import path from 'path';
import { fsPromises } from '../util/fs-promises';
import { E } from '../../../common/fp-ts/fp';
import { isObjectWithKey } from '../../../common/type-assertion';

export async function directoryExists(dirPath: string) {
  return pipe(
    await fileStat(dirPath),
    E.map((it) => it.isDirectory())
  );
}

export async function fileExists(filePath: string) {
  return pipe(
    await fileStat(filePath),
    E.map((it) => !it.isDirectory())
  );
}

export async function fileStat(dirPath: string) {
  try {
    const data = await fsPromises.stat(dirPath);
    return E.right(data);
  } catch (err) {
    if (isObjectWithKey(err, 'code') && err.code === 'ENOENT') {
      return E.left(`${dirPath} does not exist`);
    }
    return E.left(`Error: ${err}`);
  }
}

export async function getPathsInDir(dirPath: string) {
  const exists = await directoryExists(dirPath);
  if (E.isLeft(exists)) return exists;
  const files = await fsPromises.readdir(dirPath);
  return E.right(files.map((it) => path.join(dirPath, it)));
}
