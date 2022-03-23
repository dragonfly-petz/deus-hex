import { Chance } from 'chance';

function uInt8(chance: Chance.Chance) {
  return chance.integer({ min: 0, max: 2 ** 8 - 1 });
}

function uInt16(chance: Chance.Chance) {
  return chance.integer({ min: 0, max: 2 ** 16 - 1 });
}

function uInt32(chance: Chance.Chance) {
  return chance.integer({ min: 0, max: 2 ** 32 - 1 });
}

export const chanceUtil = {
  uInt8,
  uInt16,
  uInt32,
};
