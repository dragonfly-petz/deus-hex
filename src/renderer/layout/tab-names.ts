export const tabNames = [
  'petzResources',
  'breedClothingTransform',
  'clothingRename',
] as const;
export type TabName = typeof tabNames[number];
export const defaultTab = tabNames[0] as TabName;
