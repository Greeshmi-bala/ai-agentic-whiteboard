import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// ==========================================
// USERS TABLE
// ==========================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  name: text("name"),

  email: text("email")
    .notNull()
    .unique(),

  credits: integer("credits")
    .default(3),

  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),
});

// ==========================================
// BOARDS TABLE
// ==========================================

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),

  // Unique identifier for each workspace.
  projectId: varchar("project_id", {
    length: 255,
  })
    .notNull()
    .unique(),

  // Workspace name.
  projectName: varchar("project_name", {
    length: 255,
  }).notNull(),

  // Optional workspace description.
  description: text("description"),

  // Email of the workspace owner.
  userEmail: varchar("user_email", {
    length: 255,
  }).notNull(),

  // Excalidraw scene stored as JSON text.
  // Includes elements, app state, and image file data.
  whiteboardContent: text("whiteboard_content")
    .notNull()
    .default("[]"),

  // Existing document editor content.
  documentContent: text("document_content")
    .notNull()
    .default(""),

  // Workspace creation timestamp.
  createdAt: timestamp("created_at")
    .defaultNow()
    .notNull(),

  // Last update timestamp.
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull(),
});

// ==========================================
// TYPES
// ==========================================

export type User = typeof users.$inferSelect;

export type NewUser = typeof users.$inferInsert;

export type Board = typeof boards.$inferSelect;

export type NewBoard = typeof boards.$inferInsert;