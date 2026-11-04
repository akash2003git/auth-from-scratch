/**
 * Public OAuth error codes.
 *
 * Keep these intentionally broad. Detailed failure reasons belong in server
 * logs, not in the URL or the UI.
 */
export const OAUTH_PUBLIC_ERRORS = ["oauth_denied", "oauth_failed"] as const;

export type OAuthPublicError = (typeof OAUTH_PUBLIC_ERRORS)[number];

export const OAUTH_ERROR_MESSAGES: Record<OAuthPublicError, string> = {
  oauth_denied: "Sign-in was cancelled.",
  oauth_failed: "We couldn't sign you in. Please try again.",
};

export function isOAuthPublicError(
  value: string | null | undefined,
): value is OAuthPublicError {
  return value === "oauth_denied" || value === "oauth_failed";
}

/** Returns a safe user-facing message, or null for an unknown error code. */
export function getOAuthErrorMessage(
  value: string | null | undefined,
): string | null {
  return isOAuthPublicError(value) ? OAUTH_ERROR_MESSAGES[value] : null;
}
