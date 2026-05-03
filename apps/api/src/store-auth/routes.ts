import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import {
  customerProfile,
  customerSessionResponse,
  loginBody,
  registerCustomerBody,
} from "@repo/types/storefront";
import type { AppEnv } from "../context";
import { requireCustomer } from "../auth/middleware";
import {
  jsonRequestBody,
  jsonResponse,
  standardErrorResponses,
  successEnvelope,
} from "../openapi/envelope";
import {
  loginCustomerController,
  meController,
  registerCustomerController,
} from "./controller";

export const storeAuthRoutes = new Hono<AppEnv>();

const TAGS = ["store-auth"];

storeAuthRoutes.post(
  "/register",
  describeRoute({
    operationId: "storeRegisterCustomer",
    summary: "Register a new customer account",
    tags: TAGS,
    requestBody: jsonRequestBody(registerCustomerBody),
    responses: {
      201: jsonResponse(
        "Customer session",
        successEnvelope(customerSessionResponse),
      ),
      ...standardErrorResponses,
    },
  }),
  registerCustomerController,
);

storeAuthRoutes.post(
  "/login",
  describeRoute({
    operationId: "storeLoginCustomer",
    summary: "Sign in as a customer",
    tags: TAGS,
    requestBody: jsonRequestBody(loginBody),
    responses: {
      200: jsonResponse(
        "Customer session",
        successEnvelope(customerSessionResponse),
      ),
      ...standardErrorResponses,
    },
  }),
  loginCustomerController,
);

const meRouter = new Hono<AppEnv>();
meRouter.use("*", requireCustomer);
meRouter.get(
  "/",
  describeRoute({
    operationId: "storeGetCurrentCustomer",
    summary: "Get the current authenticated customer profile",
    tags: TAGS,
    responses: {
      200: jsonResponse(
        "Customer profile",
        successEnvelope(customerProfile),
      ),
      ...standardErrorResponses,
    },
  }),
  meController,
);
storeAuthRoutes.route("/me", meRouter);
