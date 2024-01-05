import * as df from 'date-fns';
// export * as dftz from "date-fns-tz";

export const DF = {
  ...df,
};

export function formatDateDistance(date: Date) {
  return DF.formatDistanceToNow(date, { addSuffix: true });
}

export function formatDateStandard(date: Date) {
  return DF.format(date, 'HH:mm dd-MMM-yyyy');
}

export const maxDate = new Date(8640000000000000);
