import path from 'path';

const repoRootPath = path.join(__dirname, '../../');

export function getRepoRootPath(...paths: string[]): string {
  return path.join(repoRootPath, ...paths);
}

const testResourcesPath = path.join(__dirname, '../__tests__/resources');

export function getTestResourcesPath(...paths: string[]): string {
  return path.join(testResourcesPath, ...paths);
}
