export function debugLineEndings(str: string) {
  return str.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}
