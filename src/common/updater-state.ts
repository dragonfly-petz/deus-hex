export type UpdaterState =
  | UpdaterError
  | UpdaterChecking
  | UpdaterNotAvailable
  | UpdaterAvailable
  | UpdaterDownloading
  | UpdaterDownloaded;

export const defaultUpdaterState: UpdaterState = { tag: 'checking' };
interface UpdaterError {
  tag: 'error';
  error: string;
}

interface UpdaterChecking {
  tag: 'checking';
}

interface UpdaterNotAvailable {
  tag: 'not-available';
}

interface UpdaterAvailable {
  tag: 'available';
  version: string;
}

interface UpdaterDownloading {
  tag: 'downloading';
  version: string | null;
  percent: number;
}

interface UpdaterDownloaded {
  tag: 'downloaded';
  version: string;
}
