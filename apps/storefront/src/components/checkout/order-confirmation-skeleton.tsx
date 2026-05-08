import { Skeleton } from '@/components/ui/skeleton';

export function OrderConfirmationSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      {/* Header: icon + title + order id */}
      <div className="flex items-start gap-4">
        <Skeleton className="mt-1 h-8 w-8 shrink-0 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      {/* Items card */}
      <div className="rounded-xl border">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-4 px-6 py-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 shrink-0 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}
          <Skeleton className="h-px w-full" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>

      {/* Shipping address card */}
      <div className="rounded-xl border">
        <div className="border-b px-6 py-4">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-1.5 px-6 py-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Continue shopping button */}
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}
