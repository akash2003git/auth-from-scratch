import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { PASSWORD_RESET_TOKEN_EXPIRATION_IN_SECONDS } from "@/lib/auth/constants";

/** Generates the raw token. This value goes in the reset link, never the database. */
export function createPasswordResetToken(byteLength = 32) {
  return randomBytes(byteLength).toString("hex");
}

/** Hashes a raw token. Only the hash goes to the database. */
export function hashPasswordResetToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Returns the database expiry for a new password reset token. */
export function getPasswordResetTokenExpiry(now = new Date()) {
  return new Date(
    now.getTime() + PASSWORD_RESET_TOKEN_EXPIRATION_IN_SECONDS * 1000,
  );
}
