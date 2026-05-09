import { eq } from "@repo/database";
import { db } from "@repo/database/client";
import { storeSettings } from "@repo/database/schema";
import type { StoreSettingsDetail, UpdateStoreSettingsBody } from "@repo/types/admin";

function toDetail(
  row: typeof storeSettings.$inferSelect,
): StoreSettingsDetail {
  return {
    id: row.id,
    companyName: row.companyName,
    addressStreet: row.addressStreet,
    addressCity: row.addressCity,
    addressZip: row.addressZip,
    addressCountry: row.addressCountry,
    taxId: row.taxId,
    vatNumber: row.vatNumber,
    bankName: row.bankName,
    iban: row.iban,
    bic: row.bic,
    accountHolder: row.accountHolder,
    logoUrl: row.logoUrl,
    invoicePrefix: row.invoicePrefix,
    invoiceFooterText: row.invoiceFooterText,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getStoreSettings(): Promise<StoreSettingsDetail | null> {
  const rows = await db.select().from(storeSettings).limit(1);
  const row = rows[0];
  return row ? toDetail(row) : null;
}

export async function upsertStoreSettings(
  body: UpdateStoreSettingsBody,
): Promise<StoreSettingsDetail> {
  const existing = await db.select({ id: storeSettings.id }).from(storeSettings).limit(1);

  const values: Partial<typeof storeSettings.$inferInsert> = {
    companyName: body.companyName,
  };
  if (body.addressStreet !== undefined) values.addressStreet = body.addressStreet;
  if (body.addressCity !== undefined) values.addressCity = body.addressCity;
  if (body.addressZip !== undefined) values.addressZip = body.addressZip;
  if (body.addressCountry !== undefined) values.addressCountry = body.addressCountry;
  if (body.taxId !== undefined) values.taxId = body.taxId;
  if (body.vatNumber !== undefined) values.vatNumber = body.vatNumber;
  if (body.bankName !== undefined) values.bankName = body.bankName;
  if (body.iban !== undefined) values.iban = body.iban;
  if (body.bic !== undefined) values.bic = body.bic;
  if (body.accountHolder !== undefined) values.accountHolder = body.accountHolder;
  if (body.logoUrl !== undefined) values.logoUrl = body.logoUrl;
  if (body.invoicePrefix !== undefined) values.invoicePrefix = body.invoicePrefix;
  if (body.invoiceFooterText !== undefined) values.invoiceFooterText = body.invoiceFooterText;

  if (existing[0]) {
    const { id } = existing[0];
    await db
      .update(storeSettings)
      .set(values)
      .where(eq(storeSettings.id, id));
    const updated = await db.select().from(storeSettings).limit(1);
    return toDetail(updated[0]!);
  }

  const [row] = await db
    .insert(storeSettings)
    .values(values as typeof storeSettings.$inferInsert)
    .returning();
  return toDetail(row!);
}
