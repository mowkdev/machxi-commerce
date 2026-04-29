import * as React from 'react';
import { IconPhoto } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AssignedMediaPreview } from '@/features/media/components/AssignedMediaPreview';
import { MediaPickerModal } from '@/features/media/components/MediaPickerModal';
import type { MediaListItem, ProductDetailMedia } from '@repo/types/admin';
import { useUpdateProduct, useUpdateVariant } from '../hooks';

type MediaTarget =
  | { type: 'product'; productId: string }
  | { type: 'variant'; productId: string; variantId: string };

interface ProductMediaManagerProps {
  title: string;
  description?: string;
  media: ProductDetailMedia[];
  target: MediaTarget;
}

function toMediaListItem(item: ProductDetailMedia): MediaListItem {
  return {
    id: item.media.id,
    fileName: item.media.altText ?? `media-${item.media.id.slice(0, 8)}`,
    mimeType: item.media.mimeType,
    sizeBytes: 0,
    width: null,
    height: null,
    url: item.media.url,
    thumbnailUrl: null,
    title: item.media.altText,
    altText: item.media.altText,
    createdAt: '',
    updatedAt: '',
  };
}

function orderedMediaPayload(ids: string[]) {
  return ids.map((mediaId, rank) => ({ mediaId, rank }));
}

export function ProductMediaManager({
  title,
  description,
  media,
  target,
}: ProductMediaManagerProps) {
  const [open, setOpen] = React.useState(false);
  const productMutation = useUpdateProduct(target.productId);
  const variantMutation = useUpdateVariant(target.productId);

  const sortedMedia = React.useMemo(
    () => [...media].sort((a, b) => a.rank - b.rank),
    [media]
  );
  const items = React.useMemo(() => sortedMedia.map(toMediaListItem), [sortedMedia]);
  const hasImages = items.length > 0;
  const isPending =
    target.type === 'product' ? productMutation.isPending : variantMutation.isPending;

  const handleSave = async (ids: string[]) => {
    const body = { media: orderedMediaPayload(ids) };
    if (target.type === 'product') {
      await productMutation.mutateAsync(body);
    } else {
      await variantMutation.mutateAsync({
        variantId: target.variantId,
        body,
      });
    }
    setOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            {hasImages ? 'Update Images' : 'Add Images'}
          </Button>
        </CardHeader>
        <CardContent>
          {hasImages ? (
            <AssignedMediaPreview items={items} />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm transition hover:bg-muted/50"
            >
              <IconPhoto className="size-8 text-muted-foreground" />
              <span className="font-medium">No images uploaded</span>
              <span className="text-muted-foreground">
                Add images from the media library or upload new files.
              </span>
            </button>
          )}
        </CardContent>
      </Card>

      {open ? (
        <MediaPickerModal
          open={open}
          onOpenChange={setOpen}
          initialItems={items}
          onSave={handleSave}
          isSaving={isPending}
        />
      ) : null}
    </>
  );
}
