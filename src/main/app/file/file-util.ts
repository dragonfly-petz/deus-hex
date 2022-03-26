import { fsPromises } from '../util/fs-promises';
import { E } from '../../../common/fp-ts/fp';
import { isObjectWithKey } from '../../../common/type-assertion';

export async function directoryExists(dirPath: string) {
  try {
    const data = await fsPromises.stat(dirPath);
    if (data.isDirectory()) {
      return E.right(true);
    }
    {
      return E.left(`${dirPath} exists but is not a directory`);
    }
  } catch (err) {
    if (isObjectWithKey(err, 'code') && err.code === 'ENOENT') {
      return E.left(`${dirPath} does not exist`);
    }
    return E.left(`Error: ${err}`);
  }
}
