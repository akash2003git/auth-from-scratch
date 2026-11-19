import { redirect } from "next/navigation";
import { APP_URL } from "@/lib/auth/oauth/config";
import {
  clearCodeVerifierCookie,
  clearStateCookie,
  readCodeVerifierCookie,
  readStateCookie,
} from "@/lib/auth/oauth/cookies";
import type { OAuthPublicError } from "@/lib/auth/oauth/errors";
import { exchangeCodeForToken, getGitHubIdentity } from "@/lib/auth/oauth/github";
import { resolveOAuthUser } from "@/lib/auth/oauth/accounts";
import { createSession } from "@/lib/auth/session-lifecycle";

async function fail(error: OAuthPublicError): Promise<never> {
  await clearStateCookie("github");
  await clearCodeVerifierCookie("github");
  redirect(new URL(`/login?error=${error}`, APP_URL).toString());
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    console.error("GitHub OAuth error", { stage: "authorization", error });
    return fail(error === "access_denied" ? "oauth_denied" : "oauth_failed");
  }

  const stateCookie = await readStateCookie("github");
  const codeVerifier = await readCodeVerifierCookie("github");

  if (!code || !state || !stateCookie || stateCookie !== state) {
    return fail("oauth_failed");
  }

  if (!codeVerifier) {
    console.error("GitHub OAuth failed", { stage: "pkce", reason: "missing_verifier" });
    return fail("oauth_failed");
  }

  await clearStateCookie("github");
  await clearCodeVerifierCookie("github");

  const tokenResult = await exchangeCodeForToken(code, codeVerifier);

  if (!tokenResult.ok) {
    console.error("GitHub token exchange failed", {
      stage: "token_exchange",
      reason: tokenResult.reason,
      status: tokenResult.status,
      providerError: tokenResult.providerError,
    });
    return fail("oauth_failed");
  }

  const identityResult = await getGitHubIdentity(tokenResult.accessToken);

  if (!identityResult.ok) {
    console.error("GitHub profile fetch failed", {
      stage: "profile",
      reason: identityResult.reason,
      status: identityResult.status,
    });
    return fail("oauth_failed");
  }

  const identity = identityResult.identity;

  const resolution = await resolveOAuthUser({
    provider: "github",
    providerUserId: identity.providerUserId,
    email: identity.email,
    login: identity.login,
  });

  if (!resolution.ok) {
    console.error("GitHub account resolution failed", {
      stage: "account_resolution",
      reason: resolution.reason,
    });
    return fail("oauth_failed");
  }

  await createSession(resolution.userId);
  redirect(new URL("/dashboard", APP_URL).toString());
}
