import "server-only";

import {
  clearSessionCookies,
  getRefreshToken,
  setSessionCookies,
} from "./cookies";
import { createToken } from "./jwt";
import { issueRefreshToken, revokeTokenFamily } from "./refresh-token";

export async function createSession(userId: string) {
  const { refreshToken } = await issueRefreshToken(userId);
  const accessToken = await createToken(userId);
  await setSessionCookies(accessToken, refreshToken);
}

export async function deleteSession() {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    await revokeTokenFamily(refreshToken);
  }

  await clearSessionCookies();
}
