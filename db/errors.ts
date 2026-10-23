type PgError = {
  code?: string;
  constraint_name?: string;
};

export type UniqueField = "email" | "username";

// Drizzle wraps driver errors in DrizzleQueryError, so the Postgres error
// lives on `cause`. Walk the chain until we find something with a `code`.
function findPgError(error: unknown): PgError | null {
  let current: unknown = error;

  while (current && typeof current === "object") {
    if ("code" in current) {
      return current as PgError;
    }

    current = "cause" in current
      ? (current as { cause?: unknown }).cause
      : undefined;
  }

  return null;
}

export function uniqueViolationField(error: unknown): UniqueField | null {
  const pgError = findPgError(error);

  if (pgError?.code !== "23505") {
    return null;
  }

  switch (pgError.constraint_name) {
    case "users_email_key":
      return "email";
    case "users_username_key":
      return "username";
    default:
      return null;
  }
}
