// bcrypt hashes at most 72 bytes of input and silently discards the rest,
// on both signup and login. Exported so validation can enforce it up front
// instead of letting users think their password is stronger than it is.
export const MAX_PASSWORD_BYTES = 72;
export const BCRYPT_COST = 12;
export const ACCESS_TOKEN_EXPIRATION_IN_SECONDS = 15 * 60;
export const REFRESH_TOKEN_EXPIRATION_IN_SECONDS = 30 * 24 * 60 * 60;
