import { beforeAll, describe, expect, it } from 'vitest';
import { db } from '@repo/database/client';
import { eq, ne } from '@repo/database';
import { languages } from '@repo/database/schema';
import type {
  CreateOptionDefinitionBody,
  CreateOptionValueBody,
} from '@repo/types/admin';
import {
  createOptionDefinition,
  createOptionValue,
  getOptionDefinitionDetail,
  listOptionCatalog,
  updateOptionDefinition,
  updateOptionValue,
} from '../service';

let secondLocale = 'fr';

beforeAll(async () => {
  const defaultLang = await db
    .select()
    .from(languages)
    .where(eq(languages.isDefault, true))
    .limit(1);
  if (defaultLang.length === 0) {
    await db.insert(languages).values({ code: 'en', name: 'English', isDefault: true });
  }

  const nonDefault = await db
    .select()
    .from(languages)
    .where(ne(languages.isDefault, true))
    .limit(1);
  if (nonDefault.length > 0) {
    secondLocale = nonDefault[0].code;
  } else {
    try {
      await db.insert(languages).values({ code: 'fr', name: 'French', isDefault: false });
      secondLocale = 'fr';
    } catch {
      secondLocale = 'en';
    }
  }
});

function uniqueCode(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeDefBody(label: string): CreateOptionDefinitionBody {
  const code = uniqueCode(label.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return {
    code,
    translations: [{ languageCode: 'en', name: label }],
  };
}

function makeValueBody(label: string): CreateOptionValueBody {
  const code = uniqueCode(label.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
  return {
    code,
    translations: [{ languageCode: 'en', label }],
  };
}

describe('option-definitions service', () => {
  it('creates and retrieves an option definition with translations', async () => {
    const body = makeDefBody('Color');
    const result = await createOptionDefinition(body);
    const detail = await getOptionDefinitionDetail(result.id);

    expect(detail).not.toBeNull();
    expect(detail!.code).toBe(body.code);
    expect(detail!.translations).toHaveLength(1);
    expect(detail!.translations[0].name).toBe('Color');
    expect(detail!.values).toHaveLength(0);
  });

  it('lists definitions with search and pagination', async () => {
    const body = makeDefBody('Searchable Option');
    await createOptionDefinition(body);

    const result = await listOptionCatalog({
      page: 1,
      pageSize: 20,
      search: 'Searchable Option',
      languageCode: 'en',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.meta.totalItems).toBeGreaterThanOrEqual(1);
    expect(result.data.some((d) => d.code === body.code)).toBe(true);
  });

  it('updates definition code and merges translations (add + remove)', async () => {
    const body = makeDefBody('Material');
    const { id } = await createOptionDefinition(body);

    const newCode = uniqueCode('updated-material');
    await updateOptionDefinition(id, {
      code: newCode,
      translations: [
        { languageCode: 'en', name: 'Fabric' },
        { languageCode: secondLocale, name: 'Tissu' },
      ],
    });

    const detail = await getOptionDefinitionDetail(id);
    expect(detail!.code).toBe(newCode);
    expect(detail!.translations).toHaveLength(2);
    expect(detail!.translations.find((t) => t.languageCode === 'en')?.name).toBe('Fabric');
    expect(detail!.translations.find((t) => t.languageCode === secondLocale)?.name).toBe('Tissu');

    await updateOptionDefinition(id, {
      translations: [{ languageCode: 'en', name: 'Material' }],
    });
    const afterRemove = await getOptionDefinitionDetail(id);
    expect(afterRemove!.translations).toHaveLength(1);
    expect(afterRemove!.translations[0].languageCode).toBe('en');
    expect(afterRemove!.translations[0].name).toBe('Material');
  });

  it('rejects duplicate definition codes with a PG error', async () => {
    const body = makeDefBody('Duplicate Code');
    await createOptionDefinition(body);

    const duplicate: CreateOptionDefinitionBody = {
      ...body,
      translations: [{ languageCode: 'en', name: 'Another name' }],
    };

    await expect(createOptionDefinition(duplicate)).rejects.toBeTruthy();
  });

  it('creates and retrieves option values within a definition', async () => {
    const defBody = makeDefBody('Size');
    const { id: optionId } = await createOptionDefinition(defBody);

    const valueBody = makeValueBody('Small');
    const { id: valueId } = await createOptionValue(optionId, valueBody);

    const detail = await getOptionDefinitionDetail(optionId);
    expect(detail!.values).toHaveLength(1);
    expect(detail!.values[0].id).toBe(valueId);
    expect(detail!.values[0].code).toBe(valueBody.code);
    expect(detail!.values[0].translations[0].label).toBe('Small');
  });

  it('updates value code and merges value translations', async () => {
    const defBody = makeDefBody('Weight');
    const { id: optionId } = await createOptionDefinition(defBody);

    const valueBody = makeValueBody('Light');
    const { id: valueId } = await createOptionValue(optionId, valueBody);

    const newCode = uniqueCode('updated-light');
    await updateOptionValue(optionId, valueId, {
      code: newCode,
      translations: [
        { languageCode: 'en', label: 'Lightweight' },
        { languageCode: secondLocale, label: 'Léger' },
      ],
    });

    const detail = await getOptionDefinitionDetail(optionId);
    const updatedValue = detail!.values.find((v) => v.id === valueId);
    expect(updatedValue!.code).toBe(newCode);
    expect(updatedValue!.translations).toHaveLength(2);
    expect(updatedValue!.translations.find((t) => t.languageCode === secondLocale)?.label).toBe('Léger');

    await updateOptionValue(optionId, valueId, {
      translations: [{ languageCode: 'en', label: 'Light' }],
    });
    const afterRemove = await getOptionDefinitionDetail(optionId);
    const finalValue = afterRemove!.values.find((v) => v.id === valueId);
    expect(finalValue!.translations).toHaveLength(1);
  });

  it('rejects duplicate value codes within the same option', async () => {
    const defBody = makeDefBody('Texture');
    const { id: optionId } = await createOptionDefinition(defBody);

    const valueBody = makeValueBody('Smooth');
    await createOptionValue(optionId, valueBody);

    const duplicate: CreateOptionValueBody = {
      ...valueBody,
      translations: [{ languageCode: 'en', label: 'Another label' }],
    };

    await expect(createOptionValue(optionId, duplicate)).rejects.toBeTruthy();
  });

  it('returns null for non-existent definition', async () => {
    const detail = await getOptionDefinitionDetail('00000000-0000-4000-8000-000000000000');
    expect(detail).toBeNull();
  });

  it('returns false when updating a non-existent definition', async () => {
    const result = await updateOptionDefinition(
      '00000000-0000-4000-8000-000000000000',
      { code: 'nope' }
    );
    expect(result).toBe(false);
  });

  it('returns false when updating a non-existent value', async () => {
    const defBody = makeDefBody('Ghost Value');
    const { id: optionId } = await createOptionDefinition(defBody);

    const result = await updateOptionValue(
      optionId,
      '00000000-0000-4000-8000-000000000000',
      { code: 'nope' }
    );
    expect(result).toBe(false);
  });
});
