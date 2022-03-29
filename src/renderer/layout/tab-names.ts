export const tabNames = [
  'petzResources',
  'projects',
  'breedClothingTransform',
  'clothingRename',
] as const;
export type TabName = typeof tabNames[number];
