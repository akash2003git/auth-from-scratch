import { redirect } from "next/navigation";
import { APP_URL } from "@/lib/auth/oauth/config";
import { clearStateCookie, readStateCookie } from "@/lib/auth/oauth/cookies";
import type { OAuthPublicError } from "@/lib/auth/oauth/errors";
import { exchangeCodeForToken, getGitHubIdentity } from "@/lib/auth/oauth/github";

async function fail(error: OAuthPublicError): Promise<never> {
  await clearStateCookie("github");
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

  if (!code || !state || !stateCookie || stateCookie !== state) {
    return fail("oauth_failed");
  }

  await clearStateCookie("github");

  const tokenResult = await exchangeCodeForToken(code);

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

  // Temporary: verifies the normalized identity before account resolution.
  // Remove this before committing the real sign-in flow.
  console.log("GitHub identity", identityResult.identity);

  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
