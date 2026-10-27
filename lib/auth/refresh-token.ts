import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { refreshTokensTable } from "@/db/schema";
import { REFRESH_TOKEN_EXPIRATION_IN_SECONDS } from "@/lib/auth/constants";

export type RotateResult =
  | { ok: true; userId: string; refreshToken: string }
  | { ok: false; reason: "invalid" | "expired" | "replayed" };

/** Returns the database expiry for a new refresh token. */
function getRefreshTokenExpiry(now = new Date()) {
  return new Date(
    now.getTime() + REFRESH_TOKEN_EXPIRATION_IN_SECONDS * 1000,
  );
}

/** Generates the raw token. This value goes to the browser. */
export function createRefreshToken(byteLength = 32) {
  return randomBytes(byteLength).toString("base64url");
}

/** Hashes a raw token. Only the hash goes to the database. */
export function hashRefreshToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a refresh-token row.
 *
 * Returns the raw token so the caller can put it in a cookie. The raw token
 * is never stored. Pass a familyId to add a token to an existing family.
 */
export async function issueRefreshToken(
  userId: string,
  familyId: string = randomUUID(),
) {
  const rawToken = createRefreshToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = getRefreshTokenExpiry();

  const [inserted] = await db
    .insert(refreshTokensTable)
    .values({
      userId,
      familyId,
      tokenHash,
      expiresAt,
    })
    .returning({ id: refreshTokensTable.id });

  if (!inserted) {
    throw new Error("Failed to insert refresh token");
  }

  return { id: inserted.id, refreshToken: rawToken };
}

/**
 * Replaces one refresh token with a new one.
 *
 * The check and the replacement happen in one transaction. A token that is
 * already revoked means a replay, so the whole family is revoked.
 */
export async function rotateRefreshToken(
  rawToken: string,
): Promise<RotateResult> {
  const tokenHash = hashRefreshToken(rawToken);
  const now = new Date();

  // Prepare the replacement before the transaction starts.
  const newId = randomUUID();
  const newRawToken = createRefreshToken();
  const newTokenHash = hashRefreshToken(newRawToken);
  const newExpiresAt = getRefreshTokenExpiry(now);

  return db.transaction(async (tx): Promise<RotateResult> => {
    // Claim the old row only if it is active and not expired.
    // The database lets only one concurrent request win this update.
    const [claimed] = await tx
      .update(refreshTokensTable)
      .set({ revokedAt: now })
      .where(
        and(
          eq(refreshTokensTable.tokenHash, tokenHash),
          isNull(refreshTokensTable.revokedAt),
          gt(refreshTokensTable.expiresAt, now),
        ),
      )
      .returning({
        id: refreshTokensTable.id,
        userId: refreshTokensTable.userId,
        familyId: refreshTokensTable.familyId,
      });

    // Nothing was claimed. Find out why.
    if (!claimed) {
      const [row] = await tx
        .select({
          familyId: refreshTokensTable.familyId,
          revokedAt: refreshTokensTable.revokedAt,
        })
        .from(refreshTokensTable)
        .where(eq(refreshTokensTable.tokenHash, tokenHash))
        .limit(1);

      if (!row) {
        return { ok: false, reason: "invalid" };
      }

      // The token was already used. Treat it as replay and revoke the family.
      if (row.revokedAt !== null) {
        await tx
          .update(refreshTokensTable)
          .set({ revokedAt: now })
          .where(
            and(
              eq(refreshTokensTable.familyId, row.familyId),
              isNull(refreshTokensTable.revokedAt),
            ),
          );

        return { ok: false, reason: "replayed" };
      }

      return { ok: false, reason: "expired" };
    }

    // Insert the replacement in the same family.
    await tx.insert(refreshTokensTable).values({
      id: newId,
      userId: claimed.userId,
      familyId: claimed.familyId,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    });

    // Link the old row to the new row. This runs after the insert because
    // replaced_by has a foreign key to the new row.
    await tx
      .update(refreshTokensTable)
      .set({ replacedBy: newId })
      .where(eq(refreshTokensTable.id, claimed.id));

    return {
      ok: true,
      userId: claimed.userId,
      refreshToken: newRawToken,
    };
  });
}

/**
 * Revokes every active token in a family.
 *
 * Use this on logout and when replay is detected.
 */
export async function revokeFamily(familyId: string) {
  await db
    .update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokensTable.familyId, familyId),
        isNull(refreshTokensTable.revokedAt),
      ),
    );
}
