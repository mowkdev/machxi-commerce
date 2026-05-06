import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { OptionDefinitionDetail, OptionValueDetail } from '@repo/types/admin';
import { OptionValueEditDrawer } from './OptionValueEditDrawer';

interface OptionValuesTableProps {
  definition: OptionDefinitionDetail;
  selectedLocale: string;
  defaultLocale: string;
}

function resolveValueLabel(
  value: OptionValueDetail,
  selectedLocale: string,
  defaultLocale: string
): string {
  const selectedTranslation = value.translations.find(
    (t) => t.languageCode === selectedLocale
  );
  if (selectedTranslation?.label) return selectedTranslation.label;

  const defaultTranslation = value.translations.find(
    (t) => t.languageCode === defaultLocale
  );
  if (defaultTranslation?.label) return defaultTranslation.label;

  return value.code;
}

export function OptionValuesTable({
  definition,
  selectedLocale,
  defaultLocale,
}: OptionValuesTableProps) {
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [isNewValue, setIsNewValue] = useState(false);

  const values = definition.values;
  const editingValue = values.find((v) => v.id === editingValueId) ?? null;

  const drawerOpen = isNewValue || !!editingValueId;

  function openCreate() {
    setEditingValueId(null);
    setIsNewValue(true);
  }

  function closeDrawer(open: boolean) {
    if (!open) {
      setEditingValueId(null);
      setIsNewValue(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Values ({values.length})</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={openCreate}>
            <IconPlus className="size-4" />
            Add value
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden rounded-b-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {values.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-16 text-center text-muted-foreground">
                      No values yet. Add option values to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  values.map((value) => (
                    <TableRow
                      key={value.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setIsNewValue(false);
                        setEditingValueId(value.id);
                      }}
                    >
                      <TableCell className="font-medium">
                        {resolveValueLabel(value, selectedLocale, defaultLocale)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {value.code}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(value.updatedAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OptionValueEditDrawer
        optionId={definition.id}
        value={isNewValue ? null : editingValue}
        open={drawerOpen}
        onOpenChange={closeDrawer}
        selectedLocale={selectedLocale}
        defaultLocale={defaultLocale}
      />
    </>
  );
}
