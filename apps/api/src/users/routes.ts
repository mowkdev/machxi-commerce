import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  createUserBody,
  updateUserBody,
  userDetail,
  userListItem,
} from "@repo/types/admin";
import type { AppEnv } from "../context";
import { requireAdmin } from "../auth/middleware";
import {
  jsonRequestBody,
  jsonResponse,
  paginatedEnvelope,
  paramsFromSchema,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  createUserController,
  deleteUserController,
  getUserController,
  listUsersController,
  updateUserController,
} from "./controller";
import { listUsersQuery, userIdParam } from "./schema";

export const usersRoutes = new Hono<AppEnv>();

usersRoutes.use("*", requireAdmin);

const TAGS = ["users"];
const idParameters = paramsFromSchema(userIdParam, "path");

const createAck = z.object({ id: z.string().uuid() });
const deleteAck = z.object({
  id: z.string().uuid(),
  deleted: z.literal(true),
});

usersRoutes.get(
  "/",
  describeRoute({
    operationId: "adminListUsers",
    summary: "List users",
    tags: TAGS,
    parameters: paramsFromSchema(listUsersQuery, "query"),
    responses: {
      200: jsonResponse("Page of users", paginatedEnvelope(userListItem)),
      ...standardErrorResponses,
    },
  }),
  listUsersController,
);

usersRoutes.post(
  "/",
  describeRoute({
    operationId: "adminCreateUser",
    summary: "Create a user",
    tags: TAGS,
    requestBody: jsonRequestBody(createUserBody),
    responses: {
      201: jsonResponse("Created user id", successEnvelope(createAck)),
      ...standardErrorResponses,
    },
  }),
  createUserController,
);

usersRoutes.get(
  "/:id",
  describeRoute({
    operationId: "adminGetUser",
    summary: "Get a user",
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse("User detail", successEnvelope(userDetail)),
      ...standardErrorResponses,
    },
  }),
  getUserController,
);

usersRoutes.put(
  "/:id",
  describeRoute({
    operationId: "adminUpdateUser",
    summary: "Update a user",
    tags: TAGS,
    parameters: idParameters,
    requestBody: jsonRequestBody(updateUserBody),
    responses: {
      200: jsonResponse("Updated user", successEnvelope(userDetail)),
      ...standardErrorResponses,
    },
  }),
  updateUserController,
);

usersRoutes.delete(
  "/:id",
  describeRoute({
    operationId: "adminDeleteUser",
    summary: "Delete a user",
    tags: TAGS,
    parameters: idParameters,
    responses: {
      200: jsonResponse("User deleted", successEnvelope(deleteAck)),
      ...standardErrorResponses,
    },
  }),
  deleteUserController,
);
