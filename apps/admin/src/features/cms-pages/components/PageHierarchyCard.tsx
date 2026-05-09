import { useAdminListPages } from '@repo/admin-sdk';
import type { PageListRow } from '@repo/types/admin';
import { useFormContext } from 'react-hook-form';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { PageFormValues } from '../schema';

const NONE_VALUE = '__root__';

interface PageHierarchyCardProps {
  // Exclude the page being edited from being chosen as its own ancestor.
  excludePageId?: string;
}

export function PageHierarchyCard({ excludePageId }: PageHierarchyCardProps) {
  const { watch, setValue } = useFormContext<PageFormValues>();
  const parentId = watch('parentId');

  // Fetch all pages so the user can choose any non-self, non-descendant.
  // Cycle prevention is enforced server-side; we simply hide the editing
  // page itself for an obvious win.
  const { data: response } = useAdminListPages<{ data: PageListRow[] }>({
    pageSize: 200,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  const pages = (response?.data ?? []).filter((p) => p.id !== excludePageId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="parentId">Parent page</FieldLabel>
            <Select
              value={parentId ?? NONE_VALUE}
              onValueChange={(value) =>
                setValue('parentId', value === NONE_VALUE ? null : value, {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="parentId">
                <SelectValue placeholder="Top-level page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>— No parent (top-level) —</SelectItem>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    /{p.pathSegments.join('/') || p.handle || p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
