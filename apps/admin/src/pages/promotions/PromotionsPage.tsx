import { IconPlus } from '@tabler/icons-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import {
  AppDataGrid,
  DataGridColumnHeader,
  type DataGridFilterDef,
  type DataGridQueryParams,
} from '@/components/app-data-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { promotionsQueryPrefix } from '@/features/promotions/hooks';
import {
  adminListPromotions,
  type AdminListPromotionsQueryParamsScheduleStateEnumKey,
  type AdminListPromotionsQueryParamsSortByEnumKey,
  type AdminListPromotionsQueryParamsTypeEnumKey,
} from '@repo/admin-sdk';
import type { PromotionListItem } from '@repo/types/admin';

const TYPE_LABELS: Record<PromotionListItem['type'], string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed amount',
  free_shipping: 'Free shipping',
};

const filters: DataGridFilterDef[] = [
  {
    id: 'type',
    label: 'Type',
    options: [
      { value: 'percentage', label: 'Percentage' },
      { value: 'fixed_amount', label: 'Fixed amount' },
      { value: 'free_shipping', label: 'Free shipping' },
    ],
  },
  {
    id: 'scheduleState',
    label: 'Schedule',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'scheduled', label: 'Scheduled' },
      { value: 'expired', label: 'Expired' },
    ],
  },
];

function scheduleLabel(promotion: PromotionListItem) {
  if (promotion.startsAt && new Date(promotion.startsAt) > new Date()) return 'Scheduled';
  if (promotion.expiresAt && new Date(promotion.expiresAt) <= new Date()) return 'Expired';
  return 'Active';
}

const columns: ColumnDef<PromotionListItem>[] = [
  {
    accessorKey: 'displayName',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Promotion" />,
    cell: ({ row }) => (
      <Link to={`/promotions/${row.original.id}`} className="flex flex-col hover:underline">
        <span className="font-medium text-foreground">{row.original.displayName}</span>
        <span className="text-xs text-muted-foreground">{row.original.code}</span>
      </Link>
    ),
  },
  {
    accessorKey: 'type',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Type" />,
    cell: ({ row }) => TYPE_LABELS[row.original.type],
  },
  {
    id: 'discount',
    header: 'Discount',
    cell: ({ row }) => {
      if (row.original.type === 'percentage') return `${row.original.percentageValue}%`;
      if (row.original.type === 'fixed_amount') return `${row.original.amountCount} amounts`;
      return 'Free shipping';
    },
    enableSorting: false,
  },
  {
    id: 'scheduleState',
    header: 'Schedule',
    cell: ({ row }) => <Badge variant="secondary">{scheduleLabel(row.original)}</Badge>,
    enableSorting: false,
  },
  {
    accessorKey: 'targetCount',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Targets" />,
    cell: ({ row }) => (row.original.targetCount === 0 ? 'Global' : row.original.targetCount),
    enableSorting: false,
  },
  {
    accessorKey: 'usageLimit',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Usage" />,
    cell: ({ row }) => row.original.usageLimit ?? 'Unlimited',
    enableSorting: false,
  },
  {
    accessorKey: 'updatedAt',
    header: ({ column }) => <DataGridColumnHeader column={column} title="Updated" />,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.updatedAt).toLocaleDateString()}
      </span>
    ),
  },
];

async function fetchPromotions(params: DataGridQueryParams) {
  const res = await adminListPromotions({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    sortBy: params.sortBy as AdminListPromotionsQueryParamsSortByEnumKey | undefined,
    sortOrder: params.sortOrder,
    type: params.filters.type as AdminListPromotionsQueryParamsTypeEnumKey | undefined,
    scheduleState: params.filters
      .scheduleState as AdminListPromotionsQueryParamsScheduleStateEnumKey | undefined,
  });
  return { data: res.data, meta: res.meta };
}

export default function PromotionsPage() {
  return (
    <AppDataGrid<PromotionListItem>
      queryKey={promotionsQueryPrefix}
      columns={columns}
      fetcher={fetchPromotions}
      searchPlaceholder="Search promotions…"
      filters={filters}
      initialSort={[{ id: 'createdAt', desc: true }]}
      getRowId={(row) => row.id}
      toolbarActions={
        <Button size="sm" asChild>
          <Link to="/promotions/new">
            <IconPlus />
            <span className="hidden lg:inline">New promotion</span>
          </Link>
        </Button>
      }
    />
  );
}
