import {
  formatTimestamp,
  type TimestampedRecord,
} from '@/lib/format-timestamp';

interface RecordTimestampsProps<TRecord extends TimestampedRecord> {
  record: TRecord;
}

export function RecordTimestamps<TRecord extends TimestampedRecord>({
  record,
}: RecordTimestampsProps<TRecord>) {
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
      <div className="flex gap-1.5">
        <dt>Updated</dt>
        <dd>{formatTimestamp(record.updatedAt)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>Created</dt>
        <dd>{formatTimestamp(record.createdAt)}</dd>
      </div>
    </dl>
  );
}
