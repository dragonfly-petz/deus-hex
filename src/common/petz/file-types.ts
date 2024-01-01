import { toUpperCase } from 'fp-ts/string';
import path from 'path';
import { objectEntries } from '../object';
import { mkEntryIdQuery } from './codecs/rsrc-utility';
import {
  catzVanillaIds,
  clothesVanillaIds,
  dogzVanillaIds,
} from './vanilla-ids';
import { RcData } from './codecs/rcdata';

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

export type ResourceDataSectionType = 'ascii' | 'bitmap';

function rdsType(v: ResourceDataSectionType) {
  return v;
}

const twoCapitalLetters = /^[A-Z]{2}$/;
export const mkResourceDataSections = (data: RcData) => ({
  clzClot: {
    idMatcher: mkEntryIdQuery('CLZ'),
    name: 'Clothes Main',
    type: rdsType('ascii'),
  },
  lnzCat: {
    idMatcher: mkEntryIdQuery('LNZ', twoCapitalLetters),
    name: 'Cat Main',
    type: rdsType('ascii'),
  },
  lnzKitten: {
    idMatcher: mkEntryIdQuery('LNZ', /^[A-Z]{2}KIT$/),
    name: 'Kitten Main',
    type: rdsType('ascii'),
  },
  lnzDog: {
    idMatcher: mkEntryIdQuery('LNZ', twoCapitalLetters),
    name: 'Dog Main',
    type: rdsType('ascii'),
  },
  lnzPuppy: {
    idMatcher: mkEntryIdQuery('LNZ', /^[A-Z]{2}PUP$/),
    name: 'Puppy Main',
    type: rdsType('ascii'),
  },
  breedBmp: {
    idMatcher: mkEntryIdQuery('BMP', toUpperCase(data.displayName)),
    name: 'Breed BMP',
    type: rdsType('bitmap'),
  },
});
export type ResourceDataSections = ReturnType<typeof mkResourceDataSections>;
export type ResourceDataSectionName = keyof ResourceDataSections;
export type ResourceDataSectionDef = ResourceDataSections['clzClot'];
export const fileTypeToExpectedSections: Record<
  FileType,
  Array<ResourceDataSectionName>
> = {
  clothes: ['clzClot'],
  catz: ['lnzCat', 'lnzKitten', 'breedBmp'],
  dogz: ['lnzDog', 'lnzPuppy', 'breedBmp'],
};

export function typeFromFilePath(filePath: string): FileType | null {
  const ext = path.extname(filePath);
  const found = objectEntries(fileTypes).find((it) => {
    return it[1].extension === ext;
  });
  return found?.[0] ?? null;
}
