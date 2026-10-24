import "server-only";

import * as jose from "jose";
import { ACCESS_TOKEN_EXPIRATION_IN_SECONDS } from "@/lib/auth/constants";

if (!process.env.JWT_SECRET) {
  throw new Error("No JWT_SECRET set in .env");
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const alg = "HS256";

export type VerifiedToken = {
  userId: string;
};

export async function createToken(userId: string): Promise<string> {
  return new jose.SignJWT({})
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setSubject(userId)
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRATION_IN_SECONDS}s`)
    .sign(secret);
}

export async function verifyToken(
  token: string,
): Promise<VerifiedToken | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [alg],
    });

    if (typeof payload.sub !== "string") {
      return null;
    }

    return { userId: payload.sub };
  } catch {
    return null;
  }
}
