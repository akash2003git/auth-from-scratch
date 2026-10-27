import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth/jwt";
import { getAccessToken, getRefreshToken } from "./cookies";

export type Session = {
  userId: string;
};

export const getSession = cache(async (): Promise<Session | null> => {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    return null;
  }
  return verifyToken(accessToken);
});

export async function requireSession(next = "/dashboard"): Promise<Session> {
  const session = await getSession();

  if (session) {
    return session;
  }

  if (await getRefreshToken()) {
    redirect(`/refresh?next=${encodeURIComponent(next)}`);
  }

  redirect("/login");
}
