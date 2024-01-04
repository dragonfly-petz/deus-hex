import { isString } from 'fp-ts/string';
import { identity } from 'fp-ts/function';
import { Option } from 'fp-ts/Option';
import { isObjectWithKey } from '../../../type-assertion';
import { baseLineSerializer, LineBase } from '../section';

export function findInData(data: ColData[], key: string) {
  return data.find((it) => Array.isArray(it) && it[0] === key);
}

export type ColData = string | [string, number | string | Option<number>];

export function colDataToContentStrings(data: ColData[]) {
  const parts = new Array<string>();
  for (const sec of data) {
    if (isString(sec)) {
      parts.push(sec);
    } else if (sec.length === 2) {
      const val = sec[1];
      if (isObjectWithKey(val, '_tag')) {
        if (val._tag === 'Some') {
          parts.push(String(val.value));
        }
      } else {
        parts.push(String(sec[1]));
      }
    }
  }
  return parts;
}

export function colDataSerializerWith<A>(
  line: LineBase<unknown, A>,
  toColData: (l: A) => ColData[]
) {
  return baseLineSerializer(line, (content) => {
    return colDataToContentStrings(toColData(content)).join('');
  });
}

export function colDataSerializer(line: LineBase<unknown, ColData[]>) {
  return colDataSerializerWith(line, identity);
}
