// Re-export the CMS DTOs and add API-only query/param schemas. Mirrors the
// pattern in apps/api/src/products/schema.ts so the SDK generator picks up
// every wire-format type from a single import.

export {
  createPageBody,
  type CreatePageBody,
  updatePageBody,
  type UpdatePageBody,
  replacePageBlocksBody,
  type ReplacePageBlocksBody,
  pageDetailResponse,
  type PageDetailResponse,
  pageListRow,
  type PageListRow,
  pageStatusSchema,
  pageStatusValues,
  type PageStatus,
  blockDetail,
  type BlockDetail,
  blockTypeMetadata,
  type BlockTypeMetadata,
  listPagesQuery,
  type ListPagesQuery,
  pageIdParam,
} from '@repo/types/admin';
