import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  createRoleBody,
  permissionSummary,
  roleDetail,
  roleListItem,
  updateRoleBody,
} from "@repo/types/admin";
import type { AppEnv } from "../context";
import { requireAdmin } from "../auth/middleware";
import {
  jsonResponse,
  jsonRequestBody,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  createRoleController,
  deleteRoleController,
  getRoleController,
  listPermissionsController,
  listRolesController,
  updateRoleController,
} from "./controller";
import { listRolesQuery, roleIdParam } from "./schema";

export const rolesRoutes = new Hono<AppEnv>();

rolesRoutes.use("*", requireAdmin);

const TAGS = ["roles"];
const idParameters = paramsFromSchema(roleIdParam, "path");

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

rolesRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListRoles",
    summary: "List roles",
    tags: TAGS,
    parameters: paramsFromSchema(listRolesQuery, "query"),
    responses: {
      200: jsonResponse("Page of roles", paginatedEnvelope(roleListItem)),
      ...standardErrorResponses,
    },
  }),
  listRolesController,
);

rolesRoutes.get(
  "/permissions",
  describeRoute({
    operationId: "adminListPermissions",
    summary: "List all available permissions",
    tags: TAGS,
    responses: {
      200: jsonResponse(
        "All permissions",
        successEnvelope(z.array(permissionSummary)),
      ),
      ...standardErrorResponses,
    },
  }),
  listPermissionsController,
);

rolesRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateRole",
    summary: "Create a role",
    tags: TAGS,
    requestBody: jsonRequestBody(createRoleBody),
    responses: {
      201: jsonResponse("Created role id", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createRoleController,
);

rolesRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetRole",
    summary: "Get a role",
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse("Role detail", successEnvelope(roleDetail)),
      ...standardErrorResponses,
    },
  }),
  getRoleController,
);

rolesRoutes.put(
  "/:id",
  describeRoute({
    operationId: "adminUpdateRole",
    summary: "Update a role",
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateRoleBody),
    responses: {
      200: jsonResponse("Updated role", successEnvelope(roleDetail)),
      ...standardErrorResponses,
    },
  }),
  updateRoleController,
);

rolesRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "adminDeleteRole",
    summary: "Delete a role",
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse("Role deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteRoleController,
);
