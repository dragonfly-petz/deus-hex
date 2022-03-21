export const tabNames = ['breedClothingTransform', 'clothingRename'] as const;
export type TabName = typeof tabNames[number];
export const defaultTab = 'clothingRename';
