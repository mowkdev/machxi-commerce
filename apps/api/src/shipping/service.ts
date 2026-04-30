import { db } from "@repo/database/client";
import { and, asc, desc, eq, ilike, inArray, sql } from "@repo/database";
import {
  prices,
  priceSets,
  shippingOptions,
  shippingOptionZones,
  shippingZoneCountries,
  shippingZones,
  taxClasses,
} from "@repo/database/schema";
import type { PaginationMeta } from "@repo/types";
import type {
  CreateShippingOptionBody,
  CreateShippingZoneBody,
  ShippingOptionDetail,
  ShippingOptionListItem,
  ShippingOptionPrice,
  ShippingZoneDetail,
  ShippingZoneListItem,
  UpdateShippingOptionBody,
  UpdateShippingZoneBody,
} from "@repo/types/admin";
import type {
  ListShippingOptionsQuery,
  ListShippingZonesQuery,
} from "./schema";

type ShippingTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ZONE_SORT_COLUMNS = {
  name: shippingZones.name,
  createdAt: shippingZones.createdAt,
  updatedAt: shippingZones.updatedAt,
} as const;

const OPTION_SORT_COLUMNS = {
  name: shippingOptions.name,
  taxClassName: taxClasses.name,
  createdAt: shippingOptions.createdAt,
  updatedAt: shippingOptions.updatedAt,
} as const;

function normalizeCountryCodes(countryCodes: string[]): string[] {
  return [
    ...new Set(countryCodes.map((code) => code.trim().toUpperCase())),
  ].sort();
}

function normalizeZoneIds(zoneIds: string[]): string[] {
  return [...new Set(zoneIds)];
}

function normalizePrices(
  input: CreateShippingOptionBody["prices"],
  priceSetId: string,
) {
  return input.map((price) => ({
    priceSetId,
    currencyCode: price.currencyCode.trim().toUpperCase(),
    amount: price.amount,
    compareAtAmount: price.compareAtAmount ?? null,
    minQuantity: price.minQuantity,
    taxInclusive: price.taxInclusive,
  }));
}

async function replaceZoneCountries(
  tx: ShippingTx,
  zoneId: string,
  countryCodes: string[],
) {
  await tx
    .delete(shippingZoneCountries)
    .where(eq(shippingZoneCountries.zoneId, zoneId));

  const normalized = normalizeCountryCodes(countryCodes);
  if (normalized.length > 0) {
    await tx.insert(shippingZoneCountries).values(
      normalized.map((countryCode) => ({
        zoneId,
        countryCode,
      })),
    );
  }
}

async function replaceOptionZones(
  tx: ShippingTx,
  shippingOptionId: string,
  zoneIds: string[],
) {
  await tx
    .delete(shippingOptionZones)
    .where(eq(shippingOptionZones.shippingOptionId, shippingOptionId));

  const normalized = normalizeZoneIds(zoneIds);
  if (normalized.length > 0) {
    await tx.insert(shippingOptionZones).values(
      normalized.map((zoneId) => ({
        shippingOptionId,
        zoneId,
      })),
    );
  }
}

async function replaceOptionPrices(
  tx: ShippingTx,
  priceSetId: string,
  optionPrices: CreateShippingOptionBody["prices"],
) {
  await tx.delete(prices).where(eq(prices.priceSetId, priceSetId));
  await tx.insert(prices).values(normalizePrices(optionPrices, priceSetId));
}

async function getPricesBySetIds(
  priceSetIds: string[],
): Promise<Map<string, ShippingOptionPrice[]>> {
  if (priceSetIds.length === 0) return new Map();

  const rows = await db
    .select({
      id: prices.id,
      priceSetId: prices.priceSetId,
      currencyCode: prices.currencyCode,
      amount: prices.amount,
      compareAtAmount: prices.compareAtAmount,
      minQuantity: prices.minQuantity,
      taxInclusive: prices.taxInclusive,
    })
    .from(prices)
    .where(inArray(prices.priceSetId, priceSetIds))
    .orderBy(asc(prices.currencyCode), asc(prices.minQuantity));

  return rows.reduce<Map<string, ShippingOptionPrice[]>>((acc, row) => {
    const current = acc.get(row.priceSetId) ?? [];
    current.push({
      id: row.id,
      currencyCode: row.currencyCode,
      amount: row.amount,
      compareAtAmount: row.compareAtAmount,
      minQuantity: row.minQuantity,
      taxInclusive: row.taxInclusive,
    });
    acc.set(row.priceSetId, current);
    return acc;
  }, new Map());
}

async function getZoneNamesByOptionIds(
  optionIds: string[],
): Promise<Map<string, string[]>> {
  if (optionIds.length === 0) return new Map();

  const rows = await db
    .select({
      shippingOptionId: shippingOptionZones.shippingOptionId,
      zoneName: shippingZones.name,
    })
    .from(shippingOptionZones)
    .innerJoin(shippingZones, eq(shippingZones.id, shippingOptionZones.zoneId))
    .where(inArray(shippingOptionZones.shippingOptionId, optionIds))
    .orderBy(asc(shippingZones.name));

  return rows.reduce<Map<string, string[]>>((acc, row) => {
    const current = acc.get(row.shippingOptionId) ?? [];
    current.push(row.zoneName);
    acc.set(row.shippingOptionId, current);
    return acc;
  }, new Map());
}

async function getCountryCodesByZoneIds(
  zoneIds: string[],
): Promise<Map<string, string[]>> {
  if (zoneIds.length === 0) return new Map();

  const rows = await db
    .select({
      zoneId: shippingZoneCountries.zoneId,
      countryCode: shippingZoneCountries.countryCode,
    })
    .from(shippingZoneCountries)
    .where(inArray(shippingZoneCountries.zoneId, zoneIds))
    .orderBy(asc(shippingZoneCountries.countryCode));

  return rows.reduce<Map<string, string[]>>((acc, row) => {
    const current = acc.get(row.zoneId) ?? [];
    current.push(row.countryCode);
    acc.set(row.zoneId, current);
    return acc;
  }, new Map());
}

export async function listShippingZones(
  query: ListShippingZonesQuery,
): Promise<{ data: ShippingZoneListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? ilike(shippingZones.name, `%${query.search}%`)
    : undefined;
  const countryFilter = query.countryCode
    ? sql`exists (
        select 1 from ${shippingZoneCountries}
        where ${shippingZoneCountries.zoneId} = ${shippingZones.id}
          and ${shippingZoneCountries.countryCode} = ${query.countryCode.trim().toUpperCase()}
      )`
    : undefined;
  const sortColumn = ZONE_SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: shippingZones.id,
      name: shippingZones.name,
      optionCount: sql<number>`(
        select count(*) from ${shippingOptionZones}
        where ${shippingOptionZones.zoneId} = ${shippingZones.id}
      )`.mapWith(Number),
      createdAt: shippingZones.createdAt,
      updatedAt: shippingZones.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(shippingZones)
    .where(and(searchFilter, countryFilter))
    .orderBy(orderBy, asc(shippingZones.id))
    .limit(query.pageSize)
    .offset(offset);

  const countryCodesByZone = await getCountryCodesByZoneIds(
    rows.map((row) => row.id),
  );
  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data = rows.map(({ totalCount: _totalCount, ...row }) => ({
    ...row,
    countryCodes: countryCodesByZone.get(row.id) ?? [],
  }));

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getShippingZone(
  id: string,
): Promise<ShippingZoneDetail | null> {
  const rows = await db
    .select()
    .from(shippingZones)
    .where(eq(shippingZones.id, id))
    .limit(1);
  const zone = rows[0];
  if (!zone) return null;

  const [countries, optionLinks] = await Promise.all([
    db
      .select()
      .from(shippingZoneCountries)
      .where(eq(shippingZoneCountries.zoneId, id))
      .orderBy(asc(shippingZoneCountries.countryCode)),
    db
      .select({ shippingOptionId: shippingOptionZones.shippingOptionId })
      .from(shippingOptionZones)
      .where(eq(shippingOptionZones.zoneId, id))
      .orderBy(asc(shippingOptionZones.shippingOptionId)),
  ]);

  return {
    ...zone,
    countries,
    optionIds: optionLinks.map((link) => link.shippingOptionId),
  };
}

export async function createShippingZone(
  body: CreateShippingZoneBody,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [zone] = await tx
      .insert(shippingZones)
      .values({ name: body.name })
      .returning({ id: shippingZones.id });

    await replaceZoneCountries(tx, zone.id, body.countryCodes);
    return { id: zone.id };
  });
}

export async function updateShippingZone(
  id: string,
  body: UpdateShippingZoneBody,
): Promise<ShippingZoneDetail | null> {
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: shippingZones.id })
      .from(shippingZones)
      .where(eq(shippingZones.id, id))
      .limit(1);
    if (!existing) return null;

    if (body.name !== undefined) {
      await tx
        .update(shippingZones)
        .set({ name: body.name })
        .where(eq(shippingZones.id, id));
    }
    if (body.countryCodes !== undefined) {
      await replaceZoneCountries(tx, id, body.countryCodes);
    }

    return { id };
  });

  if (!updated) return null;
  return getShippingZone(id);
}

export async function deleteShippingZone(id: string): Promise<boolean> {
  const rows = await db
    .delete(shippingZones)
    .where(eq(shippingZones.id, id))
    .returning({ id: shippingZones.id });
  return rows.length > 0;
}

export async function listShippingOptions(
  query: ListShippingOptionsQuery,
): Promise<{ data: ShippingOptionListItem[]; meta: PaginationMeta }> {
  const searchFilter = query.search
    ? ilike(shippingOptions.name, `%${query.search}%`)
    : undefined;
  const taxClassFilter = query.taxClassId
    ? eq(shippingOptions.taxClassId, query.taxClassId)
    : undefined;
  const zoneFilter = query.zoneId
    ? sql`exists (
        select 1 from ${shippingOptionZones}
        where ${shippingOptionZones.shippingOptionId} = ${shippingOptions.id}
          and ${shippingOptionZones.zoneId} = ${query.zoneId}
      )`
    : undefined;
  const sortColumn = OPTION_SORT_COLUMNS[query.sortBy];
  const orderBy =
    query.sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);
  const offset = (query.page - 1) * query.pageSize;

  const rows = await db
    .select({
      id: shippingOptions.id,
      name: shippingOptions.name,
      priceSetId: shippingOptions.priceSetId,
      taxClassId: shippingOptions.taxClassId,
      taxClassName: taxClasses.name,
      createdAt: shippingOptions.createdAt,
      updatedAt: shippingOptions.updatedAt,
      totalCount: sql<number>`count(*) over()`.mapWith(Number),
    })
    .from(shippingOptions)
    .innerJoin(taxClasses, eq(taxClasses.id, shippingOptions.taxClassId))
    .where(and(searchFilter, taxClassFilter, zoneFilter))
    .orderBy(orderBy, asc(shippingOptions.id))
    .limit(query.pageSize)
    .offset(offset);

  const [pricesBySet, zoneNamesByOption] = await Promise.all([
    getPricesBySetIds(rows.map((row) => row.priceSetId)),
    getZoneNamesByOptionIds(rows.map((row) => row.id)),
  ]);

  const totalItems = rows[0]?.totalCount ?? 0;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const data = rows.map(({ totalCount: _totalCount, ...row }) => ({
    ...row,
    zoneNames: zoneNamesByOption.get(row.id) ?? [],
    prices: pricesBySet.get(row.priceSetId) ?? [],
  }));

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      totalPages,
      totalItems,
    },
  };
}

export async function getShippingOption(
  id: string,
): Promise<ShippingOptionDetail | null> {
  const rows = await db
    .select({
      id: shippingOptions.id,
      name: shippingOptions.name,
      priceSetId: shippingOptions.priceSetId,
      taxClassId: shippingOptions.taxClassId,
      taxClassName: taxClasses.name,
      createdAt: shippingOptions.createdAt,
      updatedAt: shippingOptions.updatedAt,
    })
    .from(shippingOptions)
    .innerJoin(taxClasses, eq(taxClasses.id, shippingOptions.taxClassId))
    .where(eq(shippingOptions.id, id))
    .limit(1);
  const option = rows[0];
  if (!option) return null;

  const [pricesBySet, zones] = await Promise.all([
    getPricesBySetIds([option.priceSetId]),
    db
      .select({
        shippingOptionId: shippingOptionZones.shippingOptionId,
        zoneId: shippingOptionZones.zoneId,
        zoneName: shippingZones.name,
        createdAt: shippingOptionZones.createdAt,
      })
      .from(shippingOptionZones)
      .innerJoin(
        shippingZones,
        eq(shippingZones.id, shippingOptionZones.zoneId),
      )
      .where(eq(shippingOptionZones.shippingOptionId, id))
      .orderBy(asc(shippingZones.name)),
  ]);

  return {
    ...option,
    zones,
    prices: pricesBySet.get(option.priceSetId) ?? [],
  };
}

export async function createShippingOption(
  body: CreateShippingOptionBody,
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [priceSet] = await tx
      .insert(priceSets)
      .values({})
      .returning({ id: priceSets.id });
    await tx.insert(prices).values(normalizePrices(body.prices, priceSet.id));

    const [option] = await tx
      .insert(shippingOptions)
      .values({
        name: body.name,
        priceSetId: priceSet.id,
        taxClassId: body.taxClassId,
      })
      .returning({ id: shippingOptions.id });

    await replaceOptionZones(tx, option.id, body.zoneIds);
    return { id: option.id };
  });
}

export async function updateShippingOption(
  id: string,
  body: UpdateShippingOptionBody,
): Promise<ShippingOptionDetail | null> {
  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shippingOptions)
      .where(eq(shippingOptions.id, id))
      .limit(1);
    if (!existing) return null;

    const updateFields: Partial<typeof shippingOptions.$inferInsert> = {};
    if (body.name !== undefined) updateFields.name = body.name;
    if (body.taxClassId !== undefined)
      updateFields.taxClassId = body.taxClassId;

    if (Object.keys(updateFields).length > 0) {
      await tx
        .update(shippingOptions)
        .set(updateFields)
        .where(eq(shippingOptions.id, id));
    }
    if (body.zoneIds !== undefined) {
      await replaceOptionZones(tx, id, body.zoneIds);
    }
    if (body.prices !== undefined) {
      await replaceOptionPrices(tx, existing.priceSetId, body.prices);
    }

    return { id };
  });

  if (!updated) return null;
  return getShippingOption(id);
}

export async function deleteShippingOption(id: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(shippingOptions)
      .where(eq(shippingOptions.id, id))
      .limit(1);
    if (!existing) return false;

    await tx.delete(shippingOptions).where(eq(shippingOptions.id, id));
    await tx.delete(priceSets).where(eq(priceSets.id, existing.priceSetId));
    return true;
  });
}
