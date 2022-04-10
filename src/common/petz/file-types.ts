import { objectEntries } from '../object';
import { mkEntryIdQuery } from './codecs/rsrc-utility';
import {
  catzVanillaIds,
  clothesVanillaIds,
  dogzVanillaIds,
} from './vanilla-ids';

export const fileTypes = {
  catz: {
    extension: '.cat',
    pathSegments: ['Resource', 'Catz'],
    name: 'Catz',
    vanillaIds: catzVanillaIds,
  },
  dogz: {
    extension: '.dog',
    pathSegments: ['Resource', 'Dogz'],
    name: 'Dogz',
    vanillaIds: dogzVanillaIds,
  },
  clothes: {
    extension: '.clo',
    pathSegments: ['Resource', 'Clothes'],
    name: 'Clothes',
    vanillaIds: clothesVanillaIds,
  },
} as const;

export const fileTypesValues = objectEntries(fileTypes).map((it) => {
  return { ...it[1], type: it[0] };
});

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
