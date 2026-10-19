import { pgTable as table } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";

export const usersTable = table("users", {
  id: t.uuid("id").defaultRandom().primaryKey(),
  username: t.text("username").notNull().unique(),
  email: t.text("email").notNull().unique(),
  passwordHash: t.text("password_hash").notNull(),
  createdAt: t.timestamp("created_at", {
    withTimezone: true,
    mode: "date",
  }).defaultNow().notNull(),
})
