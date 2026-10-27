import {
  clearSessionCookies,
  getRefreshToken,
  setSessionCookies,
} from "@/lib/auth/cookies";
import { createToken } from "@/lib/auth/jwt";
import { rotateRefreshToken } from "@/lib/auth/refresh-token";

function noStoreJson(status: number, error: string) {
  return Response.json(
    { ok: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return noStoreJson(403, "Invalid origin");
  }

  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearSessionCookies();
    return noStoreJson(401, "Invalid or expired session");
  }

  try {
    const result = await rotateRefreshToken(refreshToken);

    if (!result.ok) {
      await clearSessionCookies();
      return noStoreJson(401, "Invalid or expired session");
    }

    const accessToken = await createToken(result.userId);

    await setSessionCookies(accessToken, result.refreshToken);

    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Refresh failed", error);
    return noStoreJson(500, "Unable to refresh session");
  }
}
