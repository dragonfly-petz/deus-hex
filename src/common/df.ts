import * as df from 'date-fns';
// export * as dftz from "date-fns-tz";

export const DF = {
  ...df,
};

export function formatDateDistance(date: Date) {
  return DF.formatDistanceToNow(date, { addSuffix: true });
}
