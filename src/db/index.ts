import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Connect Neon to this Vercel project or configure .env.local. See DEPLOYMENT.md.");
}

const globalForDb = globalThis as typeof globalThis & {
  __quickShopPostgresqlPool?: Pool;
};

function createPool() {
  const created = new Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 5_000,
    allowExitOnIdle: true,
  });

  created.on("error", (error: Error & { code?: string }) => {
    // An idle connection may be closed during a Neon restart. Handle the event
    // without crashing the process or printing connection credentials.
    console.error("QuickShop idle database connection failed.", { code: error.code ?? "unknown" });
  });

  if (process.env.VERCEL === "1") {
    // Drain idle connections before a Fluid Compute instance is suspended.
    attachDatabasePool(created);
  }

  return created;
}

// Share a pool within a warm server instance, including during local hot reload.
export const pool = globalForDb.__quickShopPostgresqlPool ?? createPool();
globalForDb.__quickShopPostgresqlPool = pool;

export const db = drizzle({ client: pool, schema });
