import "server-only";

import { cookies } from "next/headers";
import { baseCookieOptions } from "../cookies";
import type { OAuthProvider } from "./config";
import { getStateCookieName, OAUTH_STATE_MAX_AGE_SECONDS } from "./state";
import {
  getCodeVerifierCookieName,
  OAUTH_CODE_VERIFIER_MAX_AGE_SECONDS,
} from "./pkce";

export async function setStateCookie(
  provider: OAuthProvider,
  state: string,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set({
    name: getStateCookieName(provider),
    value: state,
    ...baseCookieOptions,
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS,
  });
}

export async function readStateCookie(
  provider: OAuthProvider,
): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(getStateCookieName(provider))?.value ?? null;
}

export async function clearStateCookie(
  provider: OAuthProvider,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getStateCookieName(provider));
}

export async function setCodeVerifierCookie(
  provider: OAuthProvider,
  verifier: string,
): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set({
    name: getCodeVerifierCookieName(provider),
    value: verifier,
    ...baseCookieOptions,
    maxAge: OAUTH_CODE_VERIFIER_MAX_AGE_SECONDS,
  });
}

export async function readCodeVerifierCookie(
  provider: OAuthProvider,
): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(getCodeVerifierCookieName(provider))?.value ?? null;
}

export async function clearCodeVerifierCookie(
  provider: OAuthProvider,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(getCodeVerifierCookieName(provider));
}
