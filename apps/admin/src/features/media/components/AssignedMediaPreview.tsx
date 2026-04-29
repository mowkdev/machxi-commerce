import * as React from 'react';
import { IconLayoutGrid, IconList } from '@tabler/icons-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { MediaListItem } from '@repo/types/admin';
import { MediaGrid } from './MediaGrid';
import { MediaList } from './MediaList';

type ViewMode = 'grid' | 'list';

interface AssignedMediaPreviewProps {
  items: MediaListItem[];
}

export function AssignedMediaPreview({ items }: AssignedMediaPreviewProps) {
  const [view, setView] = React.useState<ViewMode>('grid');

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value) => value && setView(value as ViewMode)}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <IconLayoutGrid className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <IconList className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {view === 'grid' ? (
        <MediaGrid
          items={items}
          selectable={false}
          className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5"
        />
      ) : (
        <MediaList items={items} selectable={false} />
      )}
    </div>
  );
}
