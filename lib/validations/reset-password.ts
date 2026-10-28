import * as z from "zod";
import { INVALID_PASSWORD_RESET_LINK_MESSAGE } from "@/lib/auth/messages";
import { passwordSchema } from "@/lib/validations/common";

export const passwordResetTokenSchema = z
  .string()
  .trim()
  .regex(/^[a-f0-9]{64}$/, INVALID_PASSWORD_RESET_LINK_MESSAGE);

export const resetPasswordSchema = z
  .object({
    token: passwordResetTokenSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const resetPasswordActionSchema = z.object({
  token: passwordResetTokenSchema,
  password: passwordSchema,
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordActionInput = z.infer<typeof resetPasswordActionSchema>;
