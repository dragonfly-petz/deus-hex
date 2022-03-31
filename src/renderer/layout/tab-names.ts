export const tabNames = [
  'petzResources',
  'projects',
  'editor',
  'breedClothingTransform',
  'clothingRename',
] as const;
export type TabName = typeof tabNames[number];
