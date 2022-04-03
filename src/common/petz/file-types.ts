import { objectEntries } from '../object';
import { mkEntryIdQuery } from './codecs/rsrc-utility';

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

const twoCapitalLetters = /^[A-Z]{2}$/;
export const resourceDataSections = {
  clzClot: {
    idMatcher: mkEntryIdQuery('CLZ'),
    name: 'Clothes Main',
  },
  lnzCat: {
    idMatcher: mkEntryIdQuery('LNZ', twoCapitalLetters),
    name: 'Cat Main',
  },
  lnzKitten: {
    idMatcher: mkEntryIdQuery('LNZ', /^[A-Z]{2}KIT$/),
    name: 'Kitten Main',
  },
  lnzDog: {
    idMatcher: mkEntryIdQuery('LNZ', twoCapitalLetters),
    name: 'Dog Main',
  },
  lnzPuppy: {
    idMatcher: mkEntryIdQuery('LNZ', /^[A-Z]{2}PUP$/),
    name: 'Puppy Main',
  },
};
export type ResourceDataSections = typeof resourceDataSections;
export type ResourceDataSectionName = keyof ResourceDataSections;
export type ResourceDataSectionDef = ResourceDataSections['clzClot'];

export const fileTypeToExpectedSections: Record<
  FileType,
  Array<ResourceDataSectionName>
> = {
  clothes: ['clzClot'],
  catz: ['lnzCat', 'lnzKitten'],
  dogz: ['lnzDog', 'lnzPuppy'],
};
