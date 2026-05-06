import { z } from 'zod';

export {
  createOptionDefinitionBody,
  type CreateOptionDefinitionBody,
  updateOptionDefinitionBody,
  type UpdateOptionDefinitionBody,
  createOptionValueBody,
  type CreateOptionValueBody,
  updateOptionValueBody,
  type UpdateOptionValueBody,
  listOptionDefinitionsCatalogQuery,
  type ListOptionDefinitionsCatalogQuery,
  optionDefinitionListRow,
  type OptionDefinitionListRow,
  optionDefinitionDetail,
  type OptionDefinitionDetail,
  optionValueDetail,
  type OptionValueDetail,
} from '@repo/types/admin';

export const optionDefinitionIdParam = z.object({
  id: z.string().uuid(),
});

export const optionValueIdParams = z.object({
  id: z.string().uuid(),
  valueId: z.string().uuid(),
});
