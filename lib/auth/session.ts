import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ACCESS_TOKEN_EXPIRATION_IN_SECONDS } from "@/lib/auth/constants";
import { createToken, verifyToken } from "@/lib/auth/jwt";

const SESSION_COOKIE_NAME = "accessToken";

export type Session = {
  userId: string;
};

export async function createSession(userId: string) {
  const accessToken = await createToken(userId);
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    path: "/",
    maxAge: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

export const getSession = cache(async (): Promise<Session | null> => {
  const accessToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  return verifyToken(accessToken);
});

export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
