"use server";

import bcrypt from "bcryptjs";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  passwordResetTokensTable,
  refreshTokensTable,
  usersTable,
} from "@/db/schema";
import { BCRYPT_COST } from "@/lib/auth/constants";
import { clearSessionCookies } from "@/lib/auth/cookies";
import {
  INVALID_PASSWORD_RESET_LINK_MESSAGE,
  PASSWORD_RESET_PASSWORD_ERROR_MESSAGE,
  PASSWORD_RESET_REQUEST_MESSAGE,
  PASSWORD_RESET_SERVER_ERROR_MESSAGE,
  PASSWORD_RESET_SUCCESS_MESSAGE,
} from "@/lib/auth/messages";
import {
  createPasswordResetToken,
  getPasswordResetTokenExpiry,
  hashPasswordResetToken,
} from "@/lib/auth/password-reset";
import { fail, type ActionResult } from "@/lib/auth/result";
import { forgotPasswordSchema } from "@/lib/validations/forgot-password";
import { resetPasswordActionSchema } from "@/lib/validations/reset-password";

const RESET_PASSWORD_URL = "http://localhost:3000/reset-password";

export async function requestPasswordReset(
  input: unknown,
): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);

  // Malformed input is not an account-existence signal, so return the same
  // generic result instead of a validation error.
  if (!parsed.success) {
    return { ok: true, message: PASSWORD_RESET_REQUEST_MESSAGE };
  }

  try {
    const { email } = parsed.data;

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      return { ok: true, message: PASSWORD_RESET_REQUEST_MESSAGE };
    }

    // Delete and insert must succeed together. Otherwise a failed insert would
    // leave the user with no reset link at all.
    const { rawToken } = await db.transaction(async (tx) => {
      await tx
        .delete(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, user.id));

      const rawToken = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(rawToken);

      await tx.insert(passwordResetTokensTable).values({
        userId: user.id,
        tokenHash,
        expiresAt: getPasswordResetTokenExpiry(),
      });

      return { rawToken };
    });

    // Print only after the transaction commits, so the link is definitely valid.
    // This is the local stand-in for sending an email.
    console.log(
      `[AUTH] Reset URL: ${RESET_PASSWORD_URL}?token=${rawToken}`,
    );

    return { ok: true, message: PASSWORD_RESET_REQUEST_MESSAGE };
  } catch (error) {
    // A server failure is not an account-existence signal, so the user can be
    // told that the request failed without leaking anything.
    console.error("Password reset request failed", error);
    return fail("SERVER_ERROR", PASSWORD_RESET_SERVER_ERROR_MESSAGE);
  }
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordActionSchema.safeParse(input);

  if (!parsed.success) {
    const tokenHasError = parsed.error.issues.some(
      (issue) => issue.path[0] === "token",
    );

    return fail(
      "VALIDATION_ERROR",
      tokenHasError
        ? INVALID_PASSWORD_RESET_LINK_MESSAGE
        : PASSWORD_RESET_PASSWORD_ERROR_MESSAGE,
    );
  }

  const { token, password } = parsed.data;
  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  let result: ActionResult;

  try {
    result = await db.transaction(async (tx): Promise<ActionResult> => {
      // Claim the token atomically. A separate select-then-delete lets two
      // concurrent requests use the same link.
      const [claimed] = await tx
        .delete(passwordResetTokensTable)
        .where(
          and(
            eq(passwordResetTokensTable.tokenHash, tokenHash),
            gt(passwordResetTokensTable.expiresAt, now),
          ),
        )
        .returning({ userId: passwordResetTokensTable.userId });

      if (!claimed) {
        return fail("VALIDATION_ERROR", INVALID_PASSWORD_RESET_LINK_MESSAGE);
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

      await tx
        .update(usersTable)
        .set({ passwordHash })
        .where(eq(usersTable.id, claimed.userId));

      // Invalidate any other outstanding reset links for this user.
      await tx
        .delete(passwordResetTokensTable)
        .where(eq(passwordResetTokensTable.userId, claimed.userId));

      // Revoke every active refresh token, including sessions in other browsers.
      await tx
        .update(refreshTokensTable)
        .set({ revokedAt: now })
        .where(
          and(
            eq(refreshTokensTable.userId, claimed.userId),
            isNull(refreshTokensTable.revokedAt),
          ),
        );

      return { ok: true };
    });
  } catch (error) {
    console.error("Password reset failed", error);
    return fail("SERVER_ERROR", PASSWORD_RESET_SERVER_ERROR_MESSAGE);
  }

  if (!result.ok) {
    return result;
  }

  try {
    await clearSessionCookies();
  } catch (error) {
    // The password is already changed. Do not report the reset as failed just
    // because clearing cookies failed; the refresh token is already revoked.
    console.error("Failed to clear session cookies after password reset", error);
  }

  return { ok: true, message: PASSWORD_RESET_SUCCESS_MESSAGE };
}
