import * as z from "zod"
import { MAX_PASSWORD_BYTES } from "@/lib/auth/constants";

export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long.")
    .max(30, "Username cannot exceed 30 characters.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores."
    ),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email address is too long.")
    .pipe(z.email("Please enter a valid email.")),

  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(72, "Use at most 72 characters.")
    .regex(/[A-Z]/, "Use at least one capital letter.")
    .regex(/[^A-Za-z0-9]/, "Use at least one special character.")
    .refine(
      (pw) => new TextEncoder().encode(pw).length <= MAX_PASSWORD_BYTES,
      "Your password uses multi-byte characters and is too long. Try a shorter one.",
    )
})

export type SignupInput = z.infer<typeof signupSchema>
