import { app } from 'electron';
import path from 'path';
import { URL } from 'url';

const resourcesPath = app.isPackaged
  ? path.join(process.resourcesPath, 'assets')
  : path.join(__dirname, '../../../assets');

export function getAssetPath(...paths: string[]): string {
  return path.join(resourcesPath, ...paths);
}

export function resolveHtmlPath(htmlFileName: string): string {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

const preloadPath = app.isPackaged
  ? path.join(__dirname, 'preload.js')
  : path.join(__dirname, '..', 'preload', 'preload.js');

export function getPreloadPath(): string {
  return preloadPath;
}

const testResourcesPath = path.join(__dirname, '../../__tests__/resources');

export function getTestResourcesPath(...paths: string[]): string {
  return path.join(testResourcesPath, ...paths);
}

const repoRootPath = path.join(__dirname, '../../../');

export function getRepoRootPath(...paths: string[]): string {
  return path.join(repoRootPath, ...paths);
}

const petzResourcesPath = path.join(
  __dirname,
  '../../../../../Petz/Petz 4/Resource'
);

export function getPetzResourcesPath(...paths: string[]): string {
  return path.join(petzResourcesPath, ...paths);
}
