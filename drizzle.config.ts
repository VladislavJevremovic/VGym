import type { Config } from "drizzle-kit";

const url = process.env.TURSO_DB_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) throw new Error("TURSO_DB_URL environment variable is required");
if (!authToken) throw new Error("TURSO_AUTH_TOKEN environment variable is required");

export default {
  schema: "./src/drizzle/schema.ts",
  out: "./src/drizzle/migrations",
  dialect: "turso",
  dbCredentials: { url, authToken },
} satisfies Config;
