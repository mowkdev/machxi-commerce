import { describe, expect, it } from 'vitest';
import type { CreateTaxRateBody } from '../schema';
import {
  createTaxClass,
  createTaxRate,
  deleteTaxRate,
  getTaxClass,
  listTaxRates,
  updateTaxRate,
} from '../service';

function uniqueToken() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function createTestTaxClass() {
  return createTaxClass({ name: `Tax Class ${uniqueToken()}` });
}

function makeRate(overrides: Partial<CreateTaxRateBody> = {}): CreateTaxRateBody {
  return {
    countryCode: 'US',
    provinceCode: null,
    rate: '12.500',
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2026-02-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('tax class service', () => {
  it('creates and retrieves a tax class with rates', async () => {
    const taxClass = await createTestTaxClass();
    const rate = await createTaxRate(taxClass.id, makeRate({ provinceCode: 'CA' }));

    const detail = await getTaxClass(taxClass.id);

    expect(detail).not.toBeNull();
    expect(detail!.rates).toHaveLength(1);
    expect(detail!.rates[0].id).toBe(rate!.id);
    expect(detail!.rates[0].countryCode).toBe('US');
    expect(detail!.rates[0].provinceCode).toBe('CA');
    expect(detail!.rates[0].rate).toBe('12.500');
  });

  it('lists tax rates scoped to a tax class', async () => {
    const taxClass = await createTestTaxClass();
    await createTaxRate(taxClass.id, makeRate({ countryCode: 'US', provinceCode: 'CA' }));
    await createTaxRate(taxClass.id, makeRate({ countryCode: 'GB', provinceCode: null }));

    const rates = await listTaxRates(taxClass.id);

    expect(rates).not.toBeNull();
    expect(rates).toHaveLength(2);
    expect(rates!.map((rate) => rate.countryCode)).toEqual(['GB', 'US']);
  });

  it('updates a tax rate', async () => {
    const taxClass = await createTestTaxClass();
    const rate = await createTaxRate(taxClass.id, makeRate());

    const updated = await updateTaxRate(taxClass.id, rate!.id, {
      countryCode: 'ca',
      provinceCode: ' ON ',
      rate: 13.25,
      startsAt: null,
      endsAt: null,
    });

    expect(updated).not.toBeNull();
    expect(updated!.countryCode).toBe('CA');
    expect(updated!.provinceCode).toBe('ON');
    expect(updated!.rate).toBe('13.250');
    expect(updated!.startsAt).toBeNull();
    expect(updated!.endsAt).toBeNull();
  });

  it('deletes a tax rate', async () => {
    const taxClass = await createTestTaxClass();
    const rate = await createTaxRate(taxClass.id, makeRate());

    await expect(deleteTaxRate(taxClass.id, rate!.id)).resolves.toBe(true);
    await expect(listTaxRates(taxClass.id)).resolves.toEqual([]);
  });

  it('rejects overlapping tax rates for the same class and region', async () => {
    const taxClass = await createTestTaxClass();
    await createTaxRate(taxClass.id, makeRate());

    await expect(
      createTaxRate(
        taxClass.id,
        makeRate({
          startsAt: '2026-01-15T00:00:00.000Z',
          endsAt: '2026-03-01T00:00:00.000Z',
        })
      )
    ).rejects.toBeTruthy();
  });

  it('allows adjacent effective windows for the same class and region', async () => {
    const taxClass = await createTestTaxClass();
    await createTaxRate(taxClass.id, makeRate());

    const adjacent = await createTaxRate(
      taxClass.id,
      makeRate({
        startsAt: '2026-02-01T00:00:00.000Z',
        endsAt: '2026-03-01T00:00:00.000Z',
      })
    );

    expect(adjacent).not.toBeNull();
  });

  it('returns null or false when a rate is scoped to the wrong tax class', async () => {
    const sourceTaxClass = await createTestTaxClass();
    const otherTaxClass = await createTestTaxClass();
    const rate = await createTaxRate(sourceTaxClass.id, makeRate());

    await expect(updateTaxRate(otherTaxClass.id, rate!.id, { rate: '9.000' })).resolves.toBeNull();
    await expect(deleteTaxRate(otherTaxClass.id, rate!.id)).resolves.toBe(false);
  });
});
