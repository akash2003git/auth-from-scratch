import { redirect } from "next/navigation";
import { APP_URL } from "@/lib/auth/oauth/config";
import { clearStateCookie, readStateCookie } from "@/lib/auth/oauth/cookies";
import type { OAuthPublicError } from "@/lib/auth/oauth/errors";

async function fail(error: OAuthPublicError) {
  await clearStateCookie("github");
  redirect(new URL(`/login?error=${error}`, APP_URL).toString());
}

export async function GET(request: Request) {
  const url = new URL(request.url);

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    console.error("GitHub OAuth error", error);
    await fail(error === "access_denied" ? "oauth_denied" : "oauth_failed");
  }

  const stateCookie = await readStateCookie("github");

  if (!code || !state || !stateCookie || stateCookie !== state) {
    await fail("oauth_failed");
  }

  await clearStateCookie("github");

  return Response.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
