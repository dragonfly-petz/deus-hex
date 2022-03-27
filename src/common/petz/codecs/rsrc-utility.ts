import type { ResDataEntry, ResDirTable } from './pe-rsrc';
import { deepEqual } from '../../equality';

export interface ResourceEntryId {
  // these are just what these are called in pe files apparently
  type: number | string;
  level: number | string;
  language: number | string;
}

export function resourceEntryIdEqual(a1: ResourceEntryId, a2: ResourceEntryId) {
  return deepEqual(a1, a2);
}

export function getDataEntryById(table: ResDirTable, id: ResourceEntryId) {
  return doGetDataEntryById(table, [id.type, id.level, id.language]);
}

function doGetDataEntryById(
  table: ResDirTable,
  ids: Array<number | string>
): ResDataEntry | null {
  if (ids.length < 1) {
    throw new Error(
      `No id passed - seems that the data directory hierarchy is broken`
    );
  }
  const [id, ...rest] = ids;
  for (const entry of typeof id === 'number'
    ? table.entriesId
    : table.entriesName) {
    if (entry.name.value === id) {
      if (entry.val.tag === 'resData') {
        return entry.val.value;
      }
      return doGetDataEntryById(entry.val.value, rest);
    }
  }
  return null;
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
