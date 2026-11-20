# auth-from-scratch

An educational Next.js App Router authentication system built from scratch without third-party auth frameworks (no Auth.js, Clerk, or Supabase Auth).

The purpose of this repository is to understand the underlying mechanics, database invariants, and security tradeoffs behind modern authentication before adopting managed auth providers in production projects.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Database**: PostgreSQL with Drizzle ORM (`drizzle-orm`, `postgres`)
- **Cryptography & Tokens**: `jose` (HS256 JWTs), `bcryptjs` (password hashing), Node `node:crypto` (CSPRNG tokens, SHA-256 digests)
- **Validation & UI**: Zod, React Hook Form, Tailwind CSS, shadcn UI

## Database Schema

Defined in `db/schema.ts`:

- `users`: Core user identity (`id`, `username`, `email`, nullable `passwordHash`, `createdAt`). `passwordHash` is nullable to support passwordless OAuth-only accounts.
- `refresh_tokens`: Stateful refresh token chains (`id`, `userId`, `familyId`, `tokenHash`, `expiresAt`, `revokedAt`, `replacedBy`, `createdAt`). Only SHA-256 hashes are stored; raw tokens never hit the database.
- `password_reset_tokens`: Single-use reset tokens (`id`, `userId`, `tokenHash`, `expiresAt`, `createdAt`) stored as SHA-256 digests.
- `oauth_accounts`: External provider links (`id`, `userId`, `provider`, `providerUserId`, `createdAt`) with a unique composite index on `(provider, providerUserId)`.

## How Authentication Works

### 1. Password Registration and Login (`app/actions/auth.ts`)

- Passwords are validated with Zod, enforcing a 72-byte UTF-8 maximum (`TextEncoder`) so inputs never hit bcrypt's silent 72-byte truncation limit.
- Passwords are hashed with `bcryptjs` using a cost factor of `12`.
- Login accepts either an email (normalized to lowercase) or a username (case-sensitive). Accounts without a `passwordHash` (OAuth-only users) fail password login safely.

### 2. Dual-Token Sessions and Refresh Token Rotation (RTR)

Sessions combine a short-lived stateless JWT with a long-lived stateful refresh token stored in `HttpOnly`, `SameSite=Lax`, `Path=/` cookies (`Secure` in production):

- **Access Token (`accessToken`)**: HS256 JWT signed via `jose` (`lib/auth/jwt.ts`) containing only `sub` (`userId`) with a 15-minute expiration. Verified purely in-memory with zero database queries.
- **Refresh Token (`refreshToken`)**: 32 random `base64url` bytes with a 30-day expiration (`lib/auth/refresh-token.ts`). Only its SHA-256 digest is stored in `refresh_tokens`.
- **Atomic Rotation & Replay Detection**: `rotateRefreshToken` runs inside a PostgreSQL transaction using a conditional `UPDATE ... WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > now`. Only one request can claim an active token. It inserts a successor in the same `familyId` and sets `replacedBy`. If an already-revoked token is submitted, `rotateRefreshToken` detects a replay and revokes every active token sharing that `familyId`.

### 3. Next.js Refresh Interstitial Flow

Because Next.js Server Components cannot mutate cookies during render, session refresh uses a client-driven transition route:

1. Protected pages call `requireSession()` (`lib/auth/session.ts`) in `app/dashboard/layout.tsx` and `app/dashboard/page.tsx`.
2. If `accessToken` is valid, the page renders immediately.
3. If `accessToken` is missing or expired but a `refreshToken` cookie exists, `requireSession()` redirects to `/refresh?next=/dashboard`.
4. `RefreshSession` (`components/auth/refresh-session.tsx`) validates `next` against `window.location.origin` (preventing open redirects) and sends `POST /api/auth/refresh`.
5. `app/api/auth/refresh/route.ts` checks the `Origin` header, rotates the refresh token, issues a new JWT, sets `Cache-Control: no-store`, and updates both cookies before navigating back to `next` (or `/login` on `401`).

### 4. Password Reset (`app/actions/reset-password.ts`)

- `requestPasswordReset` deletes prior reset tokens for the user, generates a 32-byte hex token, saves its SHA-256 digest with a 15-minute expiration, and returns the exact same generic confirmation message regardless of whether the email exists or is malformed (anti-enumeration).
- `resetPassword` claims the token atomically via `DELETE ... WHERE token_hash = ? AND expires_at > now RETURNING userId` to prevent concurrent reuse, updates `passwordHash`, revokes all active `refresh_tokens` for that user across all devices, and clears session cookies.

### 5. OAuth 2.0 and OIDC with PKCE (`lib/auth/oauth/*`)

Supports GitHub (`app/api/auth/github`, `app/api/auth/callback/github`) and Google (`app/api/auth/google`, `app/api/auth/callback/google`) using raw `fetch` and `node:crypto`:

- **CSRF & PKCE**: Initiation routes generate a 32-byte `state` and an RFC 7636 `code_verifier` (32 random bytes as `base64url`), store them in short-lived (10-minute) `HttpOnly` cookies, and send `state` plus the `S256` `code_challenge` to the provider.
- **Callback Verification**: Callbacks verify `state`, clear both temporary cookies immediately, exchange `code` + `code_verifier` for a provider access token (with 10-second `AbortSignal` timeouts), and fetch user identity.
- **Verified-Email Account Linking**: Automatic account linking only proceeds when the provider marks the email verified (`primary && verified` on GitHub `/user/emails`; `email_verified === true` on Google `/userinfo`). `resolveOAuthUser` (`lib/auth/oauth/accounts.ts`) resolves `(provider, providerUserId)`, links to an existing user with the same verified email, or creates a new passwordless user with a collision-safe username inside a retried transaction.

## Intentional Shortcuts and Scope Decisions

To keep the codebase focused on core authentication concepts, the following production hardening features were intentionally omitted:

- **No RTR Grace Window or Multi-Tab Mutex**: `rotateRefreshToken` enforces strict zero-tolerance rotation. If two browser tabs or concurrent requests send the same refresh token at the same time, the second request triggers family-wide revocation and logs the user out. Production implementations typically add a short grace period (e.g., 10-15 seconds) or a client-side refresh lock.
- **Console Logging Instead of Email Delivery**: `requestPasswordReset` prints the reset URL (`http://localhost:3000/reset-password?token=...`) to the server console with a hardcoded localhost base URL rather than integrating an email provider (SMTP/Resend/SES).
- **No Rate Limiting**: Login, signup, password reset, and refresh endpoints do not enforce IP-based or account-based rate limiting or brute-force lockouts.
- **No Timing-Safe Dummy Hash on Login**: `loginUser` returns immediately when a user is not found or has no `passwordHash`, omitting a dummy `bcrypt.compare` call. Response timing differs between unknown/OAuth-only accounts and wrong-password attempts.
- **No Edge Middleware / Proactive Refresh Timer**: Route gating runs in the Server Component layer (`requireSession()`) instead of `proxy.ts`/`middleware.ts`, and there is no client-side timer refreshing the access token before expiration. Expired access tokens briefly show the `/refresh` loading state on navigation.
- **Google `/userinfo` Call Instead of `id_token` Verification**: Google OAuth retrieves profile claims from `openidconnect.googleapis.com/v1/userinfo` rather than verifying the OIDC `id_token` JWT and `nonce` directly from the token response.
- **Direct String Comparison for OAuth `state`**: Callback routes compare `stateCookie !== state` instead of `crypto.timingSafeEqual`, and GitHub/Google route handlers duplicate orchestration rather than sharing a generic provider wrapper.
- **No Expired Token Pruning Job**: Expired rows in `refresh_tokens` and `password_reset_tokens` are rejected at query time, but no background job deletes historical expired rows.

## Getting Started

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your credentials:
   ```env
   DATABASE_URL=
   DIRECT_URL=
   JWT_SECRET=
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Run database migrations**:
   ```bash
   pnpm db:migrate
   ```

4. **Start the development server**:
   ```bash
   pnpm dev
   ```
