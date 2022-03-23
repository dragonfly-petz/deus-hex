import type { ResDataEntry, ResDirTable } from './pe-rsrc';

export interface ResourceEntryId {
  // these are just what these are called in pe files apparently
  type: number | string;
  level: number | string;
  language: number | string;
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
