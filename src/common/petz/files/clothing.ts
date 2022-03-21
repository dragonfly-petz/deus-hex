import { Result } from '../../result';
import { E } from '../../fp-ts/fp';
import { sPrim } from '../parser/schema/primitives';
import { sComb } from '../parser/schema/combinators';

export interface ClothingInfo {
  currentNamesUsed: Array<string>;
  filePath: string;
}

export async function getClothingFileInfo(
  file: string
): Promise<Result<ClothingInfo>> {
  return E.right({
    filePath: file,
    currentNamesUsed: ['asdfs'],
  });
}

export const clothingSchema = sComb.sequenceProperties([
  sComb.prop('initial', sPrim.uint8Array()),
] as const);
