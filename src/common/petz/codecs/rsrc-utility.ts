import { isString } from 'fp-ts/string';
import { isNumber } from 'fp-ts/number';
import type { ResDataEntry, ResDirTable } from './pe-rsrc';
import { deepEqual } from '../../equality';
import { isNully } from '../../null';
import { mapObjectValues, objectEntries } from '../../object';
import { A } from '../../fp-ts/fp';

export interface ResourceEntryId {
  // these are just what these are called in pe files apparently
  type: number | string;
  level: number | string;
  language: number | string;
}

function literalRegexMatcher(val: string | number) {
  return new RegExp(`^${val}$`);
}

export interface ResourceEntryIdQuery {
  type?: RegexMatcherType;
  level?: RegexMatcherType;
  language?: RegexMatcherType;
}

export function resourceEntryIdQueryMatches(
  query: ResourceEntryIdQuery,
  id: ResourceEntryId
) {
  const asRegex = mapObjectValues(query, toRegex);
  return objectEntries(asRegex).every((it) => {
    return toRegex(it[1]).test(id.toString());
  });
}

type RegexMatcherType = RegExp | string | number | undefined;

function toRegex(val: RegexMatcherType): RegExp {
  if (isNully(val)) {
    return /.*/;
  }
  if (isString(val) || isNumber(val)) {
    return literalRegexMatcher(val);
  }
  return val;
}

export function mkEntryIdQuery(
  type?: RegexMatcherType,
  level?: RegexMatcherType,
  language?: RegexMatcherType
): ResourceEntryIdQuery {
  return {
    type,
    level,
    language,
  };
}

export function resourceEntryIdEqual(a1: ResourceEntryId, a2: ResourceEntryId) {
  return deepEqual(a1, a2);
}

export function getResourceEntryById(
  table: ResDirTable,
  id: ResourceEntryIdQuery
) {
  const asRegex = mapObjectValues(id, toRegex);
  const entries = doGetResourceEntriesById(
    table,
    [asRegex.type, asRegex.level, asRegex.language],
    []
  );
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];
  throw new Error(
    `Expected one entry to match query ${JSON.stringify(id)} but got ${
      entries.length
    }`
  );
}

export interface ResourceEntryWithId {
  id: ResourceEntryId;
  entry: ResDataEntry;
}

export function resourceEntryIdToStringKey(res: ResourceEntryId) {
  return `${res.type}-${res.level}-${res.language}`;
}

function doGetResourceEntriesById(
  table: ResDirTable,
  regexes: Array<RegExp>,
  matches: Array<string | number>
): Array<ResourceEntryWithId> {
  if (regexes.length < 1) {
    throw new Error(
      `No id regex passed - seems that the data directory hierarchy is broken`
    );
  }
  const [regex, ...rest] = regexes;
  const matching = [...table.entriesName, ...table.entriesId].map((entry) => {
    if (!regex.test(entry.name.value.toString())) return [];
    if (entry.val.tag === 'resData') {
      if (matches.length !== 2) {
        throw new Error(
          'Expected 2 id matches to reconstruct id - data directory hierarchy is broken?'
        );
      }
      return [
        {
          id: {
            type: matches[0],
            level: matches[1],
            language: entry.name.value,
          },
          entry: entry.val.value,
        },
      ];
    }
    return doGetResourceEntriesById(entry.val.value, rest, [
      ...matches,
      entry.name.value,
    ]);
  });

  return A.flatten(matching);
}

export interface ResDataEntryWithId {
  entry: ResDataEntry;
  id: ResourceEntryId;
}

export function getAllDataEntriesWithId(
  table: ResDirTable
): Array<ResDataEntryWithId> {
  return doGetAllDataEntriesWithId(table, []);
}

function doGetAllDataEntriesWithId(
  table: ResDirTable,
  ids: Array<number | string>
): Array<ResDataEntryWithId> {
  const out = new Array<ResDataEntryWithId>();
  for (const entry of [...table.entriesId, ...table.entriesName]) {
    if (entry.val.tag === 'resData') {
      if (ids.length === 2) {
        out.push({
          entry: entry.val.value,
          id: { type: ids[0], level: ids[1], language: entry.name.value },
        });
      } else {
        throw new Error(
          `Expected 3 ids, got ${ids.length} - error in hierarchy?`
        );
      }
    } else {
      out.push(
        ...doGetAllDataEntriesWithId(entry.val.value, [
          ...ids,
          entry.name.value,
        ])
      );
    }
  }
  return out;
}
