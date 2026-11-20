import "server-only";

export type OAuthProvider = "github" | "google";

export type ProviderConfig = {
  provider: OAuthProvider;
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: readonly string[];
  callbackUrl: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`No ${name} set in .env`);
  }

  return value;
}

export const APP_URL = requireEnv("NEXT_PUBLIC_APP_URL");

if (APP_URL.endsWith("/")) {
  throw new Error("NEXT_PUBLIC_APP_URL cannot contain a trailing slash ('/')");
}

export const githubConfig: ProviderConfig = {
  provider: "github",
  clientId: requireEnv("GITHUB_CLIENT_ID"),
  clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
  authorizationEndpoint: "https://github.com/login/oauth/authorize",
  tokenEndpoint: "https://github.com/login/oauth/access_token",
  scopes: ["read:user", "user:email"],
  callbackUrl: new URL("/api/auth/callback/github", APP_URL).toString(),
};

export const googleConfig: ProviderConfig = {
  provider: "google",
  clientId: requireEnv("GOOGLE_CLIENT_ID"),
  clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
  authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  scopes: ["openid", "email", "profile"],
  callbackUrl: new URL("/api/auth/callback/google", APP_URL).toString(),
};
