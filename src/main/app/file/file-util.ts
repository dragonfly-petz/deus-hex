import { pipe } from 'fp-ts/function';
import path from 'path';
import { debounce } from 'debounce';
import fs from 'fs';
import md5 from 'md5';
import { fsPromises } from '../util/fs-promises';
import { E } from '../../../common/fp-ts/fp';
import { isObjectWithKey } from '../../../common/type-assertion';
import { run } from '../../../common/function';
import { Disposer } from '../../../common/disposable';

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

export function watchPathForChange(
  filePath: string,
  onEvent: () => void
): Disposer {
  let md5Hash = md5(fs.readFileSync(filePath));
  const ac = new AbortController();
  const { signal } = ac;
  const watcher = fsPromises.watch(filePath, { signal });
  const handleEventChange = debounce(() => {
    const md5New = md5(fs.readFileSync(filePath));
    if (md5New === md5Hash) return;
    md5Hash = md5New;
    onEvent();
  }, 100);

  // noinspection JSIgnoredPromiseFromCall
  run(async () => {
    try {
      for await (const event of watcher) {
        if (event.eventType === 'change') {
          handleEventChange();
        }
      }
    } catch (err) {
      if (isObjectWithKey(err, 'name') && err.name === 'AbortError') {
        return;
      }
      throw err;
    }
  });
  return () => ac.abort();
}
