import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Hosting/CI environment variables take priority over local files.
// Prefer .env.local, matching the normal Next.js local development setup.
config({ path: [".env.local", ".env"], quiet: true });

// Use a direct connection for schema management when one is provided.
// The application itself continues to use DATABASE_URL from src/db/index.ts.
const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "Set DATABASE_URL in your environment or .env.local before running Drizzle Kit. See README.md for deployment instructions.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
