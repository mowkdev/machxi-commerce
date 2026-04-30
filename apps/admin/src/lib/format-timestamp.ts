export type TimestampValue = string | Date;

export interface TimestampedRecord {
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatTimestamp(value: TimestampValue) {
  const date = value instanceof Date ? value : new Date(value);

  return timestampFormatter.format(date);
}
