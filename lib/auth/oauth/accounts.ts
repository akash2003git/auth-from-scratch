import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { uniqueViolationConstraint } from "@/db/errors";
import { oauthAccountsTable, usersTable } from "@/db/schema";
import type { OAuthProvider } from "./config";

const MAX_RESOLVE_ATTEMPTS = 3;

const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ResolveOAuthUserInput = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  login: string;
};

export type ResolveOAuthUserResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "conflict" | "database_error" };

function sanitizeUsername(login: string): string {
  const normalized = login
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, USERNAME_MAX_LENGTH);

  if (normalized.length >= USERNAME_MIN_LENGTH) {
    return normalized;
  }

  return `${normalized}_user`
    .slice(0, USERNAME_MAX_LENGTH)
    .padEnd(USERNAME_MIN_LENGTH, "_");
}

function withSuffix(base: string, suffix: string): string {
  const maxBaseLength = USERNAME_MAX_LENGTH - suffix.length - 1;
  return `${base.slice(0, Math.max(maxBaseLength, 0))}_${suffix}`;
}

/**
 * Picks a username that is free right now. The unique constraint remains the
 * source of truth; this only avoids the common collision case.
 */
async function chooseUsername(tx: Transaction, login: string): Promise<string> {
  const base = sanitizeUsername(login);
  const candidates = [base];

  for (let suffix = 2; suffix <= 9; suffix += 1) {
    candidates.push(withSuffix(base, String(suffix)));
  }

  const taken = await tx
    .select({ username: usersTable.username })
    .from(usersTable)
    .where(inArray(usersTable.username, candidates));

  const takenUsernames = new Set(taken.map((row) => row.username));
  const free = candidates.find((candidate) => !takenUsernames.has(candidate));

  if (free) {
    return free;
  }

  return withSuffix(base, randomBytes(3).toString("hex"));
}

/**
 * Resolves a verified provider identity to a local user.
 *
 * Order:
 * 1. Existing (provider, providerUserId) link.
 * 2. Existing user with the same verified email -> link it.
 * 3. Create a passwordless user and link it.
 *
 * Concurrent callbacks can win any of the three unique constraints. Postgres
 * aborts the whole transaction on a constraint violation, so the retry loop
 * runs the transaction again; the next attempt then sees the winner's row.
 */
export async function resolveOAuthUser(
  input: ResolveOAuthUserInput,
): Promise<ResolveOAuthUserResult> {
  const email = input.email.trim().toLowerCase();

  for (let attempt = 1; attempt <= MAX_RESOLVE_ATTEMPTS; attempt += 1) {
    try {
      return await db.transaction(async (tx): Promise<ResolveOAuthUserResult> => {
        const [linked] = await tx
          .select({ userId: oauthAccountsTable.userId })
          .from(oauthAccountsTable)
          .where(
            and(
              eq(oauthAccountsTable.provider, input.provider),
              eq(oauthAccountsTable.providerUserId, input.providerUserId),
            ),
          )
          .limit(1);

        if (linked) {
          return { ok: true, userId: linked.userId };
        }

        const [existingUser] = await tx
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.email, email))
          .limit(1);

        if (existingUser) {
          await tx.insert(oauthAccountsTable).values({
            userId: existingUser.id,
            provider: input.provider,
            providerUserId: input.providerUserId,
          });

          return { ok: true, userId: existingUser.id };
        }

        const username = await chooseUsername(tx, input.login);

        const [newUser] = await tx
          .insert(usersTable)
          .values({
            username,
            email,
            passwordHash: null,
          })
          .returning({ id: usersTable.id });

        if (!newUser) {
          throw new Error("Failed to insert OAuth user");
        }

        await tx.insert(oauthAccountsTable).values({
          userId: newUser.id,
          provider: input.provider,
          providerUserId: input.providerUserId,
        });

        return { ok: true, userId: newUser.id };
      });
    } catch (error) {
      const constraint = uniqueViolationConstraint(error);

      if (!constraint) {
        console.error("OAuth account resolution failed", { attempt, error });
        return { ok: false, reason: "database_error" };
      }

      // Retry: a concurrent callback created the row we tried to insert.
    }
  }

  return { ok: false, reason: "conflict" };
}
