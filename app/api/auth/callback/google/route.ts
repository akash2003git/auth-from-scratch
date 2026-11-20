import { redirect } from "next/navigation";
import { resolveOAuthUser } from "@/lib/auth/oauth/accounts";
import { APP_URL } from "@/lib/auth/oauth/config";
import {
  clearCodeVerifierCookie,
  clearStateCookie,
  readCodeVerifierCookie,
  readStateCookie,
} from "@/lib/auth/oauth/cookies";
import type { OAuthPublicError } from "@/lib/auth/oauth/errors";
import { exchangeGoogleCode, getGoogleIdentity } from "@/lib/auth/oauth/google";
import { createSession } from "@/lib/auth/session-lifecycle";

async function fail(error: OAuthPublicError): Promise<never> {
  await clearStateCookie("google");
  await clearCodeVerifierCookie("google");
  redirect(new URL(`/login?error=${error}`, APP_URL).toString());
}

/**
 * Google has no username, so use the email local part as the seed. The
 * resolver sanitizes it and adds a suffix if the username is taken.
 */
function usernameSeedFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  return localPart.length > 0 ? localPart : "user";
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    console.error("Google OAuth error", {
      stage: "authorization",
      error,
      errorDescription,
    });
    return fail(error === "access_denied" ? "oauth_denied" : "oauth_failed");
  }

  const stateCookie = await readStateCookie("google");
  const codeVerifier = await readCodeVerifierCookie("google");

  if (!code || !state || !stateCookie || stateCookie !== state) {
    return fail("oauth_failed");
  }

  if (!codeVerifier) {
    console.error("Google OAuth failed", {
      stage: "pkce",
      reason: "missing_verifier",
    });
    return fail("oauth_failed");
  }

  await clearStateCookie("google");
  await clearCodeVerifierCookie("google");

  const tokenResult = await exchangeGoogleCode(code, codeVerifier);

  if (!tokenResult.ok) {
    console.error("Google token exchange failed", {
      stage: "token_exchange",
      reason: tokenResult.reason,
      status: tokenResult.status,
      providerError: tokenResult.providerError,
      providerErrorDescription: tokenResult.providerErrorDescription,
    });
    return fail("oauth_failed");
  }

  const identityResult = await getGoogleIdentity(tokenResult.accessToken);

  if (!identityResult.ok) {
    console.error("Google profile fetch failed", {
      stage: "profile",
      reason: identityResult.reason,
      status: identityResult.status,
    });
    return fail("oauth_failed");
  }

  const identity = identityResult.identity;

  const resolution = await resolveOAuthUser({
    provider: "google",
    providerUserId: identity.providerUserId,
    email: identity.email,
    login: usernameSeedFromEmail(identity.email),
  });

  if (!resolution.ok) {
    console.error("Google account resolution failed", {
      stage: "account_resolution",
      reason: resolution.reason,
    });
    return fail("oauth_failed");
  }

  await createSession(resolution.userId);
  redirect(new URL("/dashboard", APP_URL).toString());
}
