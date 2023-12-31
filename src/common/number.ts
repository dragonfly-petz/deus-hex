export function toHex(val: number, pad = 8) {
  return `0x${val.toString(16).toUpperCase().padStart(pad, '0')}`;
}

export function safeDivideToZero(numerator: number, divisor: number) {
  if (divisor === 0) return 0;
  return numerator / divisor;
}
