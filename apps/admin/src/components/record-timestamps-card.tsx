import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatTimestamp,
  type TimestampedRecord,
} from '@/lib/format-timestamp';

interface RecordTimestampsCardProps<TRecord extends TimestampedRecord> {
  record: TRecord;
}

export function RecordTimestampsCard<TRecord extends TimestampedRecord>({
  record,
}: RecordTimestampsCardProps<TRecord>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Timestamps</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Updated</dt>
            <dd className="text-right font-medium">
              {formatTimestamp(record.updatedAt)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Created</dt>
            <dd className="text-right font-medium">
              {formatTimestamp(record.createdAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
