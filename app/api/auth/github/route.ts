import { setStateCookie } from "@/lib/auth/oauth/cookies";
import { generateState } from "@/lib/auth/oauth/state";
import { githubConfig } from "@/lib/auth/oauth/config";
import { redirect } from "next/navigation";

export async function GET() {
  const state = generateState();
  await setStateCookie("github", state);

  const authUrl = new URL(githubConfig.authorizationEndpoint);

  authUrl.searchParams.set("client_id", githubConfig.clientId);
  authUrl.searchParams.set("redirect_uri", githubConfig.callbackUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", githubConfig.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("allow_signup", "true");

  return redirect(authUrl.toString());
}
