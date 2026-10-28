import { pgTable as table, type AnyPgColumn } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";

export const usersTable = table("users", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  username: t.text("username").notNull().unique(),
  email: t.text("email").notNull().unique(),
  passwordHash: t.text("password_hash").notNull(),
  createdAt: t
    .timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const refreshTokensTable = table(
  "refresh_tokens",
  {
    id: t.uuid("id").defaultRandom().primaryKey(),
    userId: t
      .uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    familyId: t.uuid("family_id").notNull(),
    tokenHash: t.text("token_hash").notNull().unique(),
    expiresAt: t
      .timestamp("expires_at", { withTimezone: true, mode: "date" })
      .notNull(),
    revokedAt: t.timestamp("revoked_at", { withTimezone: true, mode: "date" }),
    replacedBy: t
      .uuid("replaced_by")
      .references((): AnyPgColumn => refreshTokensTable.id, {
        onDelete: "set null",
      }),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (columns) => [
    t.index("refresh_tokens_family_id_idx").on(columns.familyId),
    t.index("refresh_tokens_expires_at_idx").on(columns.expiresAt),
  ],
);

export const passwordResetTokensTable = table(
  "password_reset_tokens",
  {
    id: t.uuid("id").defaultRandom().primaryKey(),
    userId: t
      .uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: t.text("token_hash").notNull().unique(),
    expiresAt: t
      .timestamp("expires_at", { withTimezone: true, mode: "date" })
      .notNull(),
    createdAt: t
      .timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (columns) => [
    t.index("password_reset_tokens_expires_at_idx").on(columns.expiresAt)
  ],

)

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type InsertRefreshToken = typeof refreshTokensTable.$inferInsert;
export type SelectRefreshToken = typeof refreshTokensTable.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokensTable.$inferInsert;
export type SelectPasswordResetToken = typeof passwordResetTokensTable.$inferSelect;
