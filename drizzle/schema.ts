import { pgTable, unique, serial, text, timestamp, integer, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text(),
	email: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	credits: integer().default(3),
}, (table) => [
	unique("users_email_unique").on(table.email),
]);

export const boards = pgTable("boards", {
	id: serial().primaryKey().notNull(),
	projectId: varchar("project_id", { length: 255 }).notNull(),
	projectName: varchar("project_name", { length: 255 }).notNull(),
	description: text(),
	userEmail: varchar("user_email", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	whiteboardContent: text("whiteboard_content").default('[]').notNull(),
	documentContent: text("document_content").default(').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("boards_project_id_unique").on(table.projectId),
]);
