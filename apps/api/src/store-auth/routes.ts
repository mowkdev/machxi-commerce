import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { z } from "zod";
import {
  changePasswordBody,
  customerProfile,
  customerSessionResponse,
  loginBody,
  registerCustomerBody,
  registerFromOrderBody,
  updateProfileBody,
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
  changePasswordController,
  loginCustomerController,
  meController,
  registerCustomerController,
  registerFromOrderController,
  updateProfileController,
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
  "/register-from-order",
  describeRoute({
    operationId: "storeRegisterFromOrder",
    summary: "Create an account after guest checkout using just a password",
    tags: TAGS,
    requestBody: jsonRequestBody(registerFromOrderBody),
    responses: {
      201: jsonResponse(
        "Customer session",
        successEnvelope(customerSessionResponse),
      ),
      ...standardErrorResponses,
    },
  }),
  registerFromOrderController,
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

const passwordChangeAck = z.object({ changed: z.literal(true) });

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
meRouter.put(
  "/",
  describeRoute({
    operationId: "storeUpdateCurrentCustomer",
    summary: "Update the current customer profile",
    tags: TAGS,
    requestBody: jsonRequestBody(updateProfileBody),
    responses: {
      200: jsonResponse("Customer profile", successEnvelope(customerProfile)),
      ...standardErrorResponses,
    },
  }),
  updateProfileController,
);
meRouter.post(
  "/password",
  describeRoute({
    operationId: "storeChangeCustomerPassword",
    summary: "Change the current customer password",
    tags: TAGS,
    requestBody: jsonRequestBody(changePasswordBody),
    responses: {
      200: jsonResponse(
        "Password changed",
        successEnvelope(passwordChangeAck),
      ),
      ...standardErrorResponses,
    },
  }),
  changePasswordController,
);
storeAuthRoutes.route("/me", meRouter);
