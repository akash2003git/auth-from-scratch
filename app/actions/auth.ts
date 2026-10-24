"use server";

import { db } from "@/db";
import { usersTable } from "@/db/schema";
import { uniqueViolationField } from "@/db/errors";
import { signupSchema } from "@/lib/validations/signup";
import { loginSchema } from "@/lib/validations/login";
import {
  BCRYPT_COST,
} from "@/lib/auth/constants";
import {
  AUTH_ERROR_MESSAGES,
  fail,
  type ActionResult,
} from "@/lib/auth/result";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/auth/session";

export async function signUp(
  input: unknown
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", AUTH_ERROR_MESSAGES.validation);
  }

  try {
    const { username, email, password } = parsed.data;
    const hash = await bcrypt.hash(password, BCRYPT_COST);

    const [newUser] = await db.insert(usersTable).values({
      username,
      email,
      passwordHash: hash,
    }).returning({ id: usersTable.id });

    await createSession(newUser.id);
    return { ok: true };
  } catch (error) {
    const field = uniqueViolationField(error);

    if (field === "email") {
      return fail(
        "EMAIL_TAKEN",
        AUTH_ERROR_MESSAGES.emailTaken,
        "email",
      );
    }

    if (field === "username") {
      return fail(
        "USERNAME_TAKEN",
        AUTH_ERROR_MESSAGES.usernameTaken,
        "username",
      );
    }

    console.error("Signup failed", error);
    return fail("SERVER_ERROR", AUTH_ERROR_MESSAGES.serverError);
  }
}

export async function loginUser(
  input: unknown
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", AUTH_ERROR_MESSAGES.invalidCredentials);
  }

  try {
    const { identifier: rawIdentifier, password } = parsed.data;
    const isEmail = z.email().safeParse(rawIdentifier).success;
    const identifier = isEmail ? rawIdentifier.toLowerCase() : rawIdentifier;
    const identifierColumn = isEmail ? usersTable.email : usersTable.username;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(identifierColumn, identifier))
      .limit(1);

    if (!user) {
      return fail("INVALID_CREDENTIALS", AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return fail("INVALID_CREDENTIALS", AUTH_ERROR_MESSAGES.invalidCredentials);
    }

    await createSession(user.id);
    return { ok: true };
  } catch (error) {
    console.error("Login failed", error);
    return fail("SERVER_ERROR", AUTH_ERROR_MESSAGES.serverError);
  }
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
