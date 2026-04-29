import { FormProvider } from 'react-hook-form';
import { FormPageShell } from '@/components/form-page-shell';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { StockLocationDetail } from '@repo/types/admin';
import { useDeleteStockLocation } from '../hooks';
import { useStockLocationForm } from '../hooks/useStockLocationForm';

interface StockLocationFormProps {
  mode: 'create' | 'edit';
  initialData?: StockLocationDetail;
}

export function StockLocationForm({ mode, initialData }: StockLocationFormProps) {
  const deleteMutation = useDeleteStockLocation();
  const {
    form,
    isCreateMode,
    isPending,
    navigateToStockLocations,
    onSubmit,
    title,
  } = useStockLocationForm({ mode, initialData });

  return (
    <FormProvider {...form}>
      <FormPageShell
        title={title}
        onBack={navigateToStockLocations}
        onSubmit={onSubmit}
        submitLabel={isPending ? 'Saving...' : isCreateMode ? 'Create' : 'Save'}
        isSubmitting={isPending}
        contentClassName="mx-auto w-full max-w-xl p-4 lg:p-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g. Main warehouse"
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
        {!isCreateMode && initialData ? (
          <Card>
            <CardHeader>
              <CardTitle>Danger zone</CardTitle>
              <CardDescription>
                Delete this stock location only if it is not referenced by inventory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger
                  type="button"
                  className={buttonVariants({ variant: 'destructive' })}
                >
                  Delete stock location
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete stock location?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This cannot be undone. Locations with inventory levels or
                      transaction history cannot be deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(initialData.id)}
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ) : null}
      </FormPageShell>
    </FormProvider>
  );
}
