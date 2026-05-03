// Customer (storefront) JWT helpers.
//
// Admin auth flows through Auth.js's cookie-based session. Customers, by
// contrast, are expected to call the API from a separate storefront client
// (web/mobile) so we issue a Bearer token they include explicitly.
//
// Tokens are signed with HS256 against AUTH_SECRET. They carry only
// `customerId` and `email`; permissions are not part of the customer model.

import { jwtVerify, SignJWT } from "jose";
import { env } from "../env";

const ALGORITHM = "HS256";
const ISSUER = "machxi-commerce";
const AUDIENCE = "storefront";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface CustomerTokenClaims {
  customerId: string;
  email: string;
}

interface SignedToken {
  token: string;
  expiresAt: string;
}

function getKey(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function signCustomerToken(
  claims: CustomerTokenClaims,
): Promise<SignedToken> {
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);
  const token = await new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.customerId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getKey());
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function verifyCustomerToken(
  token: string,
): Promise<CustomerTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof payload.sub !== "string") return null;
    if (typeof payload.email !== "string") return null;
    return { customerId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
