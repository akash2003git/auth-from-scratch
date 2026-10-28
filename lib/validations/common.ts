import * as z from "zod";
import { MAX_PASSWORD_BYTES } from "@/lib/auth/constants";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email address is too long.")
  .pipe(z.email("Please enter a valid email."));

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[A-Z]/, "Use at least one capital letter.")
  .regex(/[^A-Za-z0-9]/, "Use at least one special character.")
  .refine(
    (pw) => new TextEncoder().encode(pw).length <= MAX_PASSWORD_BYTES,
    "Your password uses multi-byte characters and is too long. Try a shorter one.",
  );
