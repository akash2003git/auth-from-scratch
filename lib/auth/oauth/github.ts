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

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_REQUEST_TIMEOUT_MS = 10_000;

export type GitHubIdentityFailure =
  | "unauthorized"
  | "rate_limited"
  | "http_error"
  | "invalid_response"
  | "network_error"
  | "email_unavailable";

export type GitHubIdentity = {
  providerUserId: string;
  login: string;
  name: string | null;
  email: string;
};

export type GitHubIdentityResult =
  | { ok: true; identity: GitHubIdentity }
  | { ok: false; reason: GitHubIdentityFailure; status?: number };

type GitHubApiResult =
  | { ok: true; data: unknown }
  | { ok: false; reason: Exclude<GitHubIdentityFailure, "email_unavailable">; status?: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function githubGet(
  path: string,
  accessToken: string,
): Promise<GitHubApiResult> {
  let response: Response;

  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
        "User-Agent": "auth-from-scratch",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(GITHUB_REQUEST_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "network_error" };
  }

  if (response.status === 401) {
    return { ok: false, reason: "unauthorized", status: 401 };
  }

  if (
    response.status === 403 &&
    response.headers.get("x-ratelimit-remaining") === "0"
  ) {
    return { ok: false, reason: "rate_limited", status: 403 };
  }

  if (!response.ok) {
    return { ok: false, reason: "http_error", status: response.status };
  }

  try {
    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, reason: "invalid_response", status: response.status };
  }
}

/**
 * Fetches and normalizes the signed-in user's GitHub profile.
 *
 * Only a primary, verified email is accepted. The access token is never
 * included in the returned value.
 */
export async function getGitHubIdentity(
  accessToken: string,
): Promise<GitHubIdentityResult> {
  const [userResult, emailsResult] = await Promise.all([
    githubGet("/user", accessToken),
    githubGet("/user/emails", accessToken),
  ]);

  if (!userResult.ok) {
    return userResult;
  }

  if (!emailsResult.ok) {
    return emailsResult;
  }

  const user = userResult.data;

  if (!isRecord(user)) {
    return { ok: false, reason: "invalid_response" };
  }

  if (typeof user.id !== "number" || !Number.isSafeInteger(user.id)) {
    return { ok: false, reason: "invalid_response" };
  }

  if (typeof user.login !== "string" || user.login.length === 0) {
    return { ok: false, reason: "invalid_response" };
  }

  if (user.name !== null && typeof user.name !== "string") {
    return { ok: false, reason: "invalid_response" };
  }

  if (!Array.isArray(emailsResult.data)) {
    return { ok: false, reason: "invalid_response" };
  }

  const primaryEmail = emailsResult.data.find(
    (entry): entry is { email: string } =>
      isRecord(entry) &&
      entry.primary === true &&
      entry.verified === true &&
      typeof entry.email === "string" &&
      entry.email.trim().length > 0,
  );

  if (!primaryEmail) {
    return { ok: false, reason: "email_unavailable" };
  }

  return {
    ok: true,
    identity: {
      providerUserId: String(user.id),
      login: user.login,
      name: user.name,
      email: primaryEmail.email.trim().toLowerCase(),
    },
  };
}
