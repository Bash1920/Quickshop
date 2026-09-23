import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. The storefront can still build, but cart, login and orders need a database. Add DATABASE_URL (Neon pooled connection string) in Vercel → Settings → Environment Variables, then redeploy."
    );
  }
  return databaseUrl;
}

const globalForDb = globalThis as typeof globalThis & {
  __quickShopPostgresqlPool?: Pool;
  __quickShopDrizzleDb?: ReturnType<typeof drizzle>;
};

function createPool(connectionString?: string) {
  const created = new Pool({
    connectionString: connectionString ?? getDatabaseUrl(),
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

export function getPool(connectionString?: string): Pool {
  if (connectionString && connectionString !== getDatabaseUrl()) {
    // Short-lived one-off database administration work, such as first-run
    // DDL over a direct Neon connection, must not replace the runtime pool.
    return createPool(connectionString);
  }
  if (!globalForDb.__quickShopPostgresqlPool) {
    globalForDb.__quickShopPostgresqlPool = createPool();
  }
  return globalForDb.__quickShopPostgresqlPool;
}

export function getDb() {
  if (!globalForDb.__quickShopDrizzleDb) {
    globalForDb.__quickShopDrizzleDb = drizzle({ client: getPool(), schema });
  }
  return globalForDb.__quickShopDrizzleDb;
}

export async function closePool() {
  const existing = globalForDb.__quickShopPostgresqlPool;
  globalForDb.__quickShopPostgresqlPool = undefined;
  globalForDb.__quickShopDrizzleDb = undefined;
  if (existing) {
    await existing.end().catch(() => undefined);
  }
}

// Lazy proxies so importing "@/db" never throws during `next build`.
// The friendly missing-DATABASE_URL error is only thrown when a query runs.
function lazyProxy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (prop === "then") return undefined;
      const target = resolve();
      const value = Reflect.get(target as object, prop, receiver);
      return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
}

export const pool = lazyProxy<Pool>(() => getPool());
export const db = lazyProxy<ReturnType<typeof drizzle>>(() => getDb());
