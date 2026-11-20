import "server-only";

import { googleConfig } from "./config";

export type GoogleTokenExchangeFailure =
  | "http_error"
  | "provider_error"
  | "invalid_response"
  | "network_error";

export type GoogleTokenExchangeResult =
  | { ok: true; accessToken: string; scope: string | null }
  | {
      ok: false;
      reason: GoogleTokenExchangeFailure;
      status?: number;
      providerError?: string;
      providerErrorDescription?: string;
    };

const TOKEN_EXCHANGE_TIMEOUT_MS = 10_000;

/**
 * Exchanges a Google authorization code for an access token.
 *
 * Google reports token failures as HTTP 4xx with a JSON error body, so the
 * body is parsed before the status is checked. Only the caller receives the
 * token; never log it or put it in a redirect URL.
 */
export async function exchangeGoogleCode(
  code: string,
  codeVerifier: string,
): Promise<GoogleTokenExchangeResult> {
  let response: Response;

  try {
    response = await fetch(googleConfig.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: googleConfig.clientId,
        client_secret: googleConfig.clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: googleConfig.callbackUrl,
      }),
      signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "network_error" };
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      reason: response.ok ? "invalid_response" : "http_error",
      status: response.status,
    };
  }

  if (!isRecord(payload)) {
    return {
      ok: false,
      reason: response.ok ? "invalid_response" : "http_error",
      status: response.status,
    };
  }

  // Google uses a 400/401 status plus this body for invalid_grant,
  // invalid_client, and similar errors.
  if (typeof payload.error === "string") {
    return {
      ok: false,
      reason: "provider_error",
      status: response.status,
      providerError: payload.error,
      providerErrorDescription:
        typeof payload.error_description === "string"
          ? payload.error_description
          : undefined,
    };
  }

  if (!response.ok) {
    return { ok: false, reason: "http_error", status: response.status };
  }

  if (
    typeof payload.access_token !== "string" ||
    payload.access_token.length === 0
  ) {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  return {
    ok: true,
    accessToken: payload.access_token,
    scope: typeof payload.scope === "string" ? payload.scope : null,
  };
}

const GOOGLE_USERINFO_ENDPOINT =
  "https://openidconnect.googleapis.com/v1/userinfo";
const USERINFO_TIMEOUT_MS = 10_000;

export type GoogleIdentityFailure =
  | "unauthorized"
  | "http_error"
  | "invalid_response"
  | "network_error"
  | "email_unavailable";

export type GoogleIdentity = {
  providerUserId: string;
  name: string | null;
  email: string;
};

export type GoogleIdentityResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; reason: GoogleIdentityFailure; status?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Fetches and normalizes the signed-in user's Google profile.
 *
 * Only an email Google marks as verified is accepted. The access token is
 * never included in the returned value.
 */
export async function getGoogleIdentity(
  accessToken: string,
): Promise<GoogleIdentityResult> {
  let response: Response;

  try {
    response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(USERINFO_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "network_error" };
  }

  if (response.status === 401) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }

  if (!response.ok) {
    return { ok: false, reason: "http_error", status: response.status };
  }

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  if (!isRecord(payload)) {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  if (typeof payload.email_verified !== "boolean") {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  if (
    payload.email_verified !== true ||
    typeof payload.email !== "string" ||
    payload.email.trim().length === 0
  ) {
    return { ok: false, reason: "email_unavailable" };
  }

  if (
    payload.name !== undefined &&
    payload.name !== null &&
    typeof payload.name !== "string"
  ) {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  return {
    ok: true,
    identity: {
      providerUserId: payload.sub,
      name: typeof payload.name === "string" ? payload.name : null,
      email: payload.email.trim().toLowerCase(),
    },
  };
}
