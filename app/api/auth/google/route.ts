import { redirect } from "next/navigation";
import { googleConfig } from "@/lib/auth/oauth/config";
import { setCodeVerifierCookie, setStateCookie } from "@/lib/auth/oauth/cookies";
import {
  createCodeChallenge,
  generateCodeVerifier,
} from "@/lib/auth/oauth/pkce";
import { generateState } from "@/lib/auth/oauth/state";

export async function GET() {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  await setStateCookie("google", state);
  await setCodeVerifierCookie("google", codeVerifier);

  const codeChallenge = createCodeChallenge(codeVerifier);

  const authUrl = new URL(googleConfig.authorizationEndpoint);

  authUrl.searchParams.set("client_id", googleConfig.clientId);
  authUrl.searchParams.set("redirect_uri", googleConfig.callbackUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", googleConfig.scopes.join(" "));
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  // Lets the user pick an account instead of silently reusing the last one.
  authUrl.searchParams.set("prompt", "select_account");

  return redirect(authUrl.toString());
}
