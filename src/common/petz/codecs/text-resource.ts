import { bytesToString, stringToBytes } from '../../buffer';

// files are crlf but the editor and parser want lf, remember so we can put it back
export type LineEnding = '\r\n' | '\n';

export interface TextResource {
  text: string;
  lineEnding: LineEnding;
}

export function decodeTextResource(data: Uint8Array): TextResource {
  const raw = bytesToString(data);
  return {
    text: raw.replace(/\r?\n/g, '\n'),
    lineEnding: raw.includes('\n') && !raw.includes('\r\n') ? '\n' : '\r\n',
  };
}

export function encodeTextResource(resource: TextResource): Uint8Array {
  return new Uint8Array(
    stringToBytes(resource.text.replace(/\n/g, resource.lineEnding))
  );
}
