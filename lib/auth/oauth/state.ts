import "server-only";

import { randomBytes } from "node:crypto";
import type { OAuthProvider } from "./config";

export const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

/** Generates an unguessable, URL-safe state value for one OAuth attempt. */
export function generateState(): string {
  return randomBytes(32).toString("hex");
}

/** Returns the provider-specific cookie name for the OAuth state. */
export function getStateCookieName(provider: OAuthProvider): string {
  return `oauth_state_${provider}`;
}
