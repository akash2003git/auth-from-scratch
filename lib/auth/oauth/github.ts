import "server-only";

import { githubConfig } from "./config";

export type TokenExchangeFailure =
  | "http_error"
  | "provider_error"
  | "invalid_response"
  | "network_error";

export type TokenExchangeResult =
  | { ok: true; accessToken: string; scope: string | null }
  | {
      ok: false;
      reason: TokenExchangeFailure;
      status?: number;
      providerError?: string;
    };

const TOKEN_EXCHANGE_TIMEOUT_MS = 10_000;

/**
 * Exchanges a GitHub authorization code for an access token.
 *
 * The token is returned to the caller only. Never log it, send it to the
 * browser, or put it in a redirect URL.
 */
export async function exchangeCodeForToken(
  code: string,
): Promise<TokenExchangeResult> {
  let response: Response;

  try {
    response = await fetch(githubConfig.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: githubConfig.clientId,
        client_secret: githubConfig.clientSecret,
        code,
        redirect_uri: githubConfig.callbackUrl,
      }),
      signal: AbortSignal.timeout(TOKEN_EXCHANGE_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "network_error" };
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

  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  const data = payload as Record<string, unknown>;

  // GitHub reports token errors with HTTP 200 and an `error` field.
  if (typeof data.error === "string") {
    return {
      ok: false,
      reason: "provider_error",
      status: response.status,
      providerError: data.error,
    };
  }

  if (typeof data.access_token !== "string" || data.access_token.length === 0) {
    return { ok: false, reason: "invalid_response", status: response.status };
  }

  return {
    ok: true,
    accessToken: data.access_token,
    scope: typeof data.scope === "string" ? data.scope : null,
  };
}
