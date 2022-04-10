export function toHex(val: number, pad = 8) {
  return `0x${val.toString(16).toUpperCase().padStart(pad, '0')}`;
}
