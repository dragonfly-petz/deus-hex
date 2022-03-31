export function debugLineEndings(str: string) {
  return str.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
}

export function normalizeLineEndingsForTextArea(str: string) {
  return str.replace(/\r?\n/g, '\n');
}
