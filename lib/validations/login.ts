import * as z from "zod";
import { MAX_PASSWORD_BYTES } from "@/lib/auth/constants";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Username or email is required.")
    .max(254, "Username or email is too long."),

  password: z
    .string()
    .min(1, "Enter your password.")
    .refine(
      (pw) => new TextEncoder().encode(pw).length <= MAX_PASSWORD_BYTES,
      "Password is too long.",
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
