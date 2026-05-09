/**
 * Renders the prop-editing form for a single block.
 *
 * The shape is driven by the block type registry's JSON Schema. We don't
 * try to render every JSON Schema construct — only the ones our blocks
 * actually use (string, boolean, integer, enum, single uuid, uuid array).
 * Anything we can't render falls back to a JSON textarea so authors can at
 * least fix it manually.
 */

import type { BlockTypeMetadata } from '@repo/types/admin';
import { useMemo } from 'react';

import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface BlockPropsFormProps {
  blockType: BlockTypeMetadata;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  // For translatable keys, the form shows the active locale's value.
  // Non-translatable keys are locale-independent.
  selectedLocale: string;
}

interface FieldDescriptor {
  key: string;
  type: 'string' | 'multiline' | 'integer' | 'boolean' | 'enum' | 'uuid' | 'uuid-array' | 'unknown';
  options?: string[];
  translatable: boolean;
  isRelation: boolean;
}

function describeFields(blockType: BlockTypeMetadata): FieldDescriptor[] {
  const schema = blockType.propsJsonSchema as {
    properties?: Record<string, Record<string, unknown>>;
  };
  const props = schema.properties ?? {};
  const translatable = new Set(blockType.translatableKeys);
  const relationKeys = new Set(blockType.relationFields.map((f) => f.key));

  return Object.entries(props).map(([key, prop]) => {
    const isRelation = relationKeys.has(key);
    if (isRelation) {
      const field = blockType.relationFields.find((f) => f.key === key)!;
      return {
        key,
        type: field.many ? 'uuid-array' : 'uuid',
        translatable: false,
        isRelation: true,
      };
    }
    const enumValues = Array.isArray((prop as { enum?: unknown[] }).enum)
      ? ((prop as { enum: unknown[] }).enum.filter((v): v is string => typeof v === 'string'))
      : undefined;
    if (enumValues && enumValues.length > 0) {
      return { key, type: 'enum', options: enumValues, translatable: translatable.has(key), isRelation: false };
    }
    const t = (prop as { type?: string }).type;
    if (t === 'boolean') return { key, type: 'boolean', translatable: translatable.has(key), isRelation: false };
    if (t === 'integer') return { key, type: 'integer', translatable: translatable.has(key), isRelation: false };
    if (t === 'string') {
      // body / description-style fields use multiline; everything else uses input.
      const long = key === 'body' || key === 'description' || key === 'metaDescription';
      return {
        key,
        type: long ? 'multiline' : 'string',
        translatable: translatable.has(key),
        isRelation: false,
      };
    }
    return { key, type: 'unknown', translatable: translatable.has(key), isRelation: false };
  });
}

export function BlockPropsForm({
  blockType,
  values,
  onChange,
  selectedLocale,
}: BlockPropsFormProps) {
  const fields = useMemo(() => describeFields(blockType), [blockType]);

  return (
    <FieldGroup>
      {fields.map((field) => {
        const value = values[field.key];
        const labelSuffix = field.translatable ? ` (${selectedLocale.toUpperCase()})` : '';
        const fieldId = `${blockType.type}-${field.key}`;

        if (field.type === 'boolean') {
          return (
            <Field key={field.key} className="flex-row items-center justify-between gap-4">
              <FieldLabel htmlFor={fieldId}>{field.key}{labelSuffix}</FieldLabel>
              <Switch
                id={fieldId}
                checked={Boolean(value)}
                onCheckedChange={(checked) => onChange(field.key, checked)}
              />
            </Field>
          );
        }

        if (field.type === 'integer') {
          return (
            <Field key={field.key}>
              <FieldLabel htmlFor={fieldId}>{field.key}{labelSuffix}</FieldLabel>
              <Input
                id={fieldId}
                type="number"
                value={typeof value === 'number' ? value : ''}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange(field.key, v === '' ? undefined : Number(v));
                }}
              />
            </Field>
          );
        }

        if (field.type === 'enum') {
          return (
            <Field key={field.key}>
              <FieldLabel htmlFor={fieldId}>{field.key}{labelSuffix}</FieldLabel>
              <Select
                value={typeof value === 'string' ? value : ''}
                onValueChange={(next) => onChange(field.key, next)}
              >
                <SelectTrigger id={fieldId}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          );
        }

        if (field.type === 'multiline') {
          return (
            <Field key={field.key}>
              <FieldLabel htmlFor={fieldId}>{field.key}{labelSuffix}</FieldLabel>
              <Textarea
                key={`${fieldId}-${selectedLocale}`}
                id={fieldId}
                value={typeof value === 'string' ? value : ''}
                rows={4}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            </Field>
          );
        }

        if (field.type === 'string') {
          return (
            <Field key={field.key}>
              <FieldLabel htmlFor={fieldId}>{field.key}{labelSuffix}</FieldLabel>
              <Input
                key={`${fieldId}-${selectedLocale}`}
                id={fieldId}
                value={typeof value === 'string' ? value : ''}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            </Field>
          );
        }

        if (field.type === 'uuid') {
          // Single relation — for v1 we accept a uuid string. A picker
          // (media library, product search) is a follow-up.
          const stringValue =
            typeof value === 'string'
              ? value
              : Array.isArray(value) && typeof value[0] === 'string'
              ? value[0]
              : '';
          return (
            <Field key={field.key}>
              <FieldLabel htmlFor={fieldId}>{field.key} (uuid)</FieldLabel>
              <Input
                id={fieldId}
                placeholder="UUID of the linked resource"
                value={stringValue}
                onChange={(e) => onChange(field.key, e.target.value || null)}
              />
            </Field>
          );
        }

        if (field.type === 'uuid-array') {
          // Repeater of uuids — comma/newline separated for v1.
          const arrayValue: string[] = Array.isArray(value)
            ? (value.filter((v) => typeof v === 'string') as string[])
            : [];
          return (
            <Field key={field.key}>
              <FieldLabel htmlFor={fieldId}>{field.key} (uuid list)</FieldLabel>
              <Textarea
                id={fieldId}
                placeholder="One UUID per line"
                rows={4}
                value={arrayValue.join('\n')}
                onChange={(e) => {
                  const next = e.target.value
                    .split(/[\s,]+/)
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
                  onChange(field.key, next);
                }}
              />
            </Field>
          );
        }

        return (
          <Field key={field.key}>
            <FieldLabel htmlFor={fieldId}>{field.key} (raw json)</FieldLabel>
            <Textarea
              id={fieldId}
              rows={3}
              value={JSON.stringify(value ?? null, null, 2)}
              onChange={(e) => {
                try {
                  onChange(field.key, JSON.parse(e.target.value));
                } catch {
                  /* ignore — user is mid-typing */
                }
              }}
            />
          </Field>
        );
      })}
    </FieldGroup>
  );
}
