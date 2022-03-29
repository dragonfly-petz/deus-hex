import { objectEntries } from '../object';

export const fileTypes = {
  catz: {
    extension: '.cat',
    pathSegments: ['Resource', 'Catz'],
    name: 'Catz',
  },
  dogz: {
    extension: '.dog',
    pathSegments: ['Resource', 'Dogz'],
    name: 'Dogz',
  },
  clothes: {
    extension: '.clo',
    pathSegments: ['Resource', 'Clothes'],
    name: 'Clothes',
  },
} as const;

export const allFileTypeExtensions = objectEntries(fileTypes).map(
  (it) => it[1].extension
);

export type FileType = keyof typeof fileTypes;
