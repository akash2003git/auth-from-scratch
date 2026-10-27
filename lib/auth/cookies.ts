import "server-only";

import { cookies } from "next/headers";
import {
  ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
  REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
} from "./constants";

export const ACCESS_COOKIE_NAME = "accessToken";
export const REFRESH_COOKIE_NAME = "refreshToken";

const baseCookieOptions = {
  httpOnly: true,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_COOKIE_NAME)?.value;
}

export async function getRefreshToken() {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value;
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string,
) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: ACCESS_COOKIE_NAME,
    value: accessToken,
    ...baseCookieOptions,
    maxAge: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
  });

  cookieStore.set({
    name: REFRESH_COOKIE_NAME,
    value: refreshToken,
    ...baseCookieOptions,
    maxAge: REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
  });
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}
