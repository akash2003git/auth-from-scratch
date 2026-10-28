import * as z from "zod";
import { emailSchema } from "@/lib/validations/common";

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
