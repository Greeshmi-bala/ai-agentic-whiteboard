import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";

// ==========================================
// DATABASE CONFIGURATION
// ==========================================

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is missing. Please configure it in your .env file."
  );
}

// ==========================================
// NEON POSTGRESQL CONNECTION
// ==========================================

const sql = neon(databaseUrl);

// ==========================================
// DRIZZLE ORM INSTANCE
// ==========================================

export const db = drizzle({
  client: sql,
  schema,
});

// ==========================================
// EXPORT DATABASE SCHEMA
// ==========================================

export * from "@/db/schema";