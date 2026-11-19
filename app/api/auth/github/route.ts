import { setCodeVerifierCookie, setStateCookie } from "@/lib/auth/oauth/cookies";
import { generateState } from "@/lib/auth/oauth/state";
import { githubConfig } from "@/lib/auth/oauth/config";
import { redirect } from "next/navigation";
import { generateCodeVerifier, createCodeChallenge } from "@/lib/auth/oauth/pkce";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  await setStateCookie("github", state);
  await setCodeVerifierCookie("github", codeVerifier);

  const codeChallenge = createCodeChallenge(codeVerifier);

  const authUrl = new URL(githubConfig.authorizationEndpoint);

  authUrl.searchParams.set("client_id", githubConfig.clientId);
  authUrl.searchParams.set("redirect_uri", githubConfig.callbackUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", githubConfig.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("allow_signup", "true");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  return redirect(authUrl.toString());
}
