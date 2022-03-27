import { app } from 'electron';
import path from 'path';
import {
  MigrationWithTarget,
  Versioned,
} from '../../../common/migration/migration';
import { fsPromises } from '../util/fs-promises';
import { isObjectWithKey } from '../../../common/type-assertion';
import { globalLogger } from '../../../common/logger';
import { globalErrorReporter } from '../../../common/error';
import { Listenable } from '../../../common/reactive/listener';
import { AsyncSequence } from '../../../common/async-sequence';
import { E } from '../../../common/fp-ts/fp';

export class PersistedStore<A> {
  constructor(private name: string, private migration: MigrationWithTarget<A>) {
    globalLogger.info(
      `Using persisted state "${name}" stored at ${this.getPath()}`
    );
  }

  private readonly asyncSequence = new AsyncSequence();

  readonly listenable = new Listenable<[A]>();

  private getPath() {
    return path.join(app.getPath('userData'), `deusHex_${this.name}.json`);
  }

  async load() {
    try {
      const data = await fsPromises.readFile(this.getPath());
      const versioned: Versioned<A> = JSON.parse(data.toString());
      return this.migration.fromVersioned(versioned);
    } catch (err) {
      if (isObjectWithKey(err, 'code') && err.code === 'ENOENT') {
        globalLogger.info(
          `No persisted state found for "${this.name}", using default`
        );
      } else {
        globalLogger.error(
          `Error loading persisted state for "${this.name}", falling back to default`
        );
        globalErrorReporter.handleCaught(err);
      }
      return this.migration.default(null);
    }
  }

  async save(val: A) {
    const toPersist = this.migration.toVersioned(val);
    return this.asyncSequence.sequence(async () => {
      await fsPromises.writeFile(this.getPath(), JSON.stringify(toPersist));
      this.listenable.notify(val);
      return E.right(true);
    });
  }
}
