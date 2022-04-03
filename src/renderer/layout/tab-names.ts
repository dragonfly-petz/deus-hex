export const tabNames = [
  'petzResources',
  'projects',
  'editor',
  'settings',
  'breedClothingTransform',
  'clothingRename',
] as const;
export type TabName = typeof tabNames[number];
