import * as z from "zod";
import { emailSchema, passwordSchema } from "@/lib/validations/common";

export const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters long.")
    .max(30, "Username cannot exceed 30 characters.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores.",
    ),

  email: emailSchema,

  password: passwordSchema,
});

export type SignupInput = z.infer<typeof signupSchema>
