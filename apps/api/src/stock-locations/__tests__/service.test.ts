import { describe, expect, it } from 'vitest';
import {
  createStockLocation,
  deleteStockLocation,
  getStockLocation,
  listStockLocations,
  updateStockLocation,
} from '../service';

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

describe('stock location service', () => {
  it('creates and retrieves a stock location', async () => {
    const name = `Warehouse ${uniqueToken()}`;
    const result = await createStockLocation({ name });

    const stockLocation = await getStockLocation(result.id);

    expect(stockLocation).not.toBeNull();
    expect(stockLocation!.name).toBe(name);
  });

  it('lists stock locations with search and pagination metadata', async () => {
    const name = `Searchable Warehouse ${uniqueToken()}`;
    await createStockLocation({ name });

    const result = await listStockLocations({
      page: 1,
      pageSize: 20,
      search: name,
      sortBy: 'name',
      sortOrder: 'asc',
    });

    expect(result.meta.totalItems).toBeGreaterThanOrEqual(1);
    expect(result.data.some((location) => location.name === name)).toBe(true);
  });

  it('updates a stock location', async () => {
    const stockLocation = await createStockLocation({ name: `Warehouse ${uniqueToken()}` });
    const updatedName = `Updated Warehouse ${uniqueToken()}`;

    const updated = await updateStockLocation(stockLocation.id, { name: updatedName });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe(updatedName);
  });

  it('deletes a stock location', async () => {
    const stockLocation = await createStockLocation({ name: `Delete Warehouse ${uniqueToken()}` });

    await expect(deleteStockLocation(stockLocation.id)).resolves.toBe(true);
    await expect(getStockLocation(stockLocation.id)).resolves.toBeNull();
  });
});
