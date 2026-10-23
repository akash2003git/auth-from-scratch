export type AuthErrorCode =
  | "VALIDATION_ERROR"
  | "EMAIL_TAKEN"
  | "USERNAME_TAKEN"
  | "INVALID_CREDENTIALS"
  | "SERVER_ERROR";

export type AuthField = "username" | "email" | "password";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AuthErrorCode; message: string; field?: AuthField };

export const AUTH_ERROR_MESSAGES = {
  validation: "Please check your signup details.",
  invalidCredentials: "Invalid username, email, or password.",
  emailTaken: "An account with this email already exists.",
  usernameTaken: "This username is already taken.",
  serverError: "An internal server error occurred. Please try again later.",
} as const;

export function fail(
  code: AuthErrorCode,
  message: string,
  field?: AuthField,
): ActionResult<never> {
  return { ok: false, code, message, field };
}
