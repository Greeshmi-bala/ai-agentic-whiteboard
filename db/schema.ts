import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  credits: integer("credits").default(3),
  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id", {
    length: 255,
  })
    .notNull()
    .unique(),
  projectName: varchar("project_name", {
    length: 255,
  }).notNull(),
  description: text("description"),
  userEmail: varchar("user_email", {
    length: 255,
  }).notNull(),
  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;