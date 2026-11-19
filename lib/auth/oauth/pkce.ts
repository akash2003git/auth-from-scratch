import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { OAuthProvider } from "./config";

export const OAUTH_CODE_VERIFIER_MAX_AGE_SECONDS = 10 * 60;

/**
 * Generates an RFC 7636 code verifier: 32 random bytes encoded as base64url,
 * which is exactly 43 characters (the RFC allows 43-128).
 */
export function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

/** Derives the S256 code challenge from a verifier. */
export function createCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** Returns the provider-specific cookie name for the PKCE verifier. */
export function getCodeVerifierCookieName(provider: OAuthProvider): string {
  return `oauth_code_verifier_${provider}`;
}
