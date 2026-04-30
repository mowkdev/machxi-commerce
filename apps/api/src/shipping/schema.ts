import { z } from "zod";

export {
  createShippingOptionBody,
  type CreateShippingOptionBody,
  createShippingZoneBody,
  type CreateShippingZoneBody,
  shippingOptionDetail,
  type ShippingOptionDetail,
  shippingOptionListItem,
  type ShippingOptionListItem,
  shippingOptionPrice,
  shippingOptionZone,
  shippingZoneDetail,
  type ShippingZoneDetail,
  shippingZoneListItem,
  type ShippingZoneListItem,
  updateShippingOptionBody,
  type UpdateShippingOptionBody,
  updateShippingZoneBody,
  type UpdateShippingZoneBody,
} from "@repo/types/admin";

export const listShippingZonesQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  countryCode: z.string().trim().length(2).optional(),
  sortBy: z.enum(["name", "createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListShippingZonesQuery = z.infer<typeof listShippingZonesQuery>;

export const listShippingOptionsQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().min(1).optional(),
  taxClassId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  sortBy: z
    .enum(["name", "taxClassName", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type ListShippingOptionsQuery = z.infer<typeof listShippingOptionsQuery>;

export const shippingZoneIdParam = z.object({
  id: z.string().uuid(),
});

export const shippingOptionIdParam = z.object({
  id: z.string().uuid(),
});
