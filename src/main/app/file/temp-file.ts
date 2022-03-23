import { app } from 'electron';
import path from 'path';
import { run } from '../../../common/function';
import { isDevOrTest } from '../util';
import { getRepoRootPath } from '../../../common/asset-path';
import { uuidV4 } from '../../../common/uuid';
import { fsPromises } from '../util/fs-promises';
import { globalLogger } from '../../../common/logger';

export async function withTempFile<A>(block: (filePath: string) => Promise<A>) {
  const tmpPath = await run(async () => {
    if (isDevOrTest()) {
      await fsPromises.mkdir(getRepoRootPath('tmp'), { recursive: true });
      // starting with a "." stops electronmon from relaunching
      return getRepoRootPath('tmp', '.devTempFile');
    }
    const tempDir = app.getPath('temp');
    const tempFileName = uuidV4();
    return path.join(tempDir, tempFileName);
  });

  globalLogger.info(`Using temp file at ${tmpPath}`);
  const res = await block(tmpPath);
  await fsPromises.rm(tmpPath);
  return res;
}

export async function withTempDir<A>(block: (dir: string) => Promise<A>) {
  const tmpFolder = await run(async () => {
    if (isDevOrTest()) {
      return getRepoRootPath('tmp');
    }
    return app.getPath('temp');
  });
  const tmpPath = path.join(tmpFolder, uuidV4());

  await fsPromises.mkdir(tmpPath, { recursive: true });
  globalLogger.info(`Using temp dir at ${tmpPath}`);
  const res = await block(tmpPath);
  await fsPromises.rm(tmpPath, { recursive: true });
  return res;
}
