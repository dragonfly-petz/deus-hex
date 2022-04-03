import path from 'path';
import * as Buffer from 'buffer';
import { isNotNully, isNully } from '../../../common/null';
import { watchPathForChange } from './file-util';
import { globalLogger } from '../../../common/logger';
import { Disposer } from '../../../common/disposable';
import type { DomIpcHolder } from '../create-window';
import { bracketAsync } from '../../../common/promise';
import { fsPromises } from '../util/fs-promises';

interface FileWatchInfo {
  disposer: Disposer;
  windowIds: Set<number>;
  filePath: string;
}

export interface FileWatchChange {
  filePath: string;
}

export class FileWatcher {
  private readonly fileWatchers = new Map<string, FileWatchInfo>();

  constructor(private domIpcHolder: DomIpcHolder) {}

  watchFile(filePathRaw: string, windowIds: Array<number>) {
    const filePath = path.normalize(filePathRaw);
    const existing = this.fileWatchers.get(filePath);
    if (isNotNully(existing)) {
      windowIds.forEach((it) => {
        existing.windowIds.add(it);
      });
      return existing.filePath;
    }
    const watchDisposer = watchPathForChange(filePath, () => {
      const watcherInfo = this.fileWatchers.get(filePath);
      if (isNully(watcherInfo)) {
        throw new Error(`Expected to find watcher info for path ${filePath}`);
      }
      for (const windowId of watcherInfo.windowIds) {
        const ipc = this.domIpcHolder.getDomIpc(windowId);
        if (isNully(ipc)) {
          globalLogger.warn(
            `Expected to find window ${windowId} when handling file watch change`
          );
          return;
        }
        ipc.onFileWatchChange({ filePath });
      }
    });
    this.fileWatchers.set(filePath, {
      disposer: watchDisposer,
      windowIds: new Set(windowIds),
      filePath,
    });
    return filePath;
  }

  async writeFileSuspendWatcher(filePath: string, data: Buffer) {
    return bracketAsync(
      () => this.suspendWatchFileIfWatching(filePath),
      () => fsPromises.writeFile(filePath, data)
    );
  }

  suspendWatchFileIfWatching(filePathRaw: string) {
    const filePath = path.normalize(filePathRaw);
    const existing = this.fileWatchers.get(filePath);
    if (isNotNully(existing)) {
      this.unwatchFile(filePath, Array.from(existing.windowIds));
    }
    return () => {
      if (isNotNully(existing)) {
        this.watchFile(filePath, Array.from(existing.windowIds));
      }
    };
  }

  unwatchFile(filePathRaw: string, windowIds: Array<number>) {
    const filePath = path.normalize(filePathRaw);
    for (const windowId of windowIds) {
      this.unwatchFileForWindow(filePath, windowId);
    }
  }

  private unwatchFileForWindow(filePath: string, windowId: number) {
    const watcher = this.fileWatchers.get(filePath);
    if (isNully(watcher)) {
      globalLogger.warn(
        `Expected to find watcher for path  ${filePath} when disposing watch file`
      );
      return;
    }
    watcher.windowIds.delete(windowId);
    if (watcher.windowIds.size < 1) {
      watcher.disposer();
      this.fileWatchers.delete(filePath);
    }
  }

  unregisterWindow(windowId: number) {
    for (const [pathId, watcher] of this.fileWatchers) {
      if (watcher.windowIds.has(windowId)) {
        this.unwatchFileForWindow(pathId, windowId);
      }
    }
  }
}
