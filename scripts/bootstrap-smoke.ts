import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";

async function main() {
  config({ path: [".env.local", ".env"], quiet: true });

  const admin = new URL(process.env.DATABASE_URL ?? "");
  if (!["localhost", "127.0.0.1"].includes(admin.hostname)) {
    throw new Error("Bootstrap smoke test only runs against local PostgreSQL.");
  }

  const name = `quickshop_bootstrap_${randomUUID().replaceAll("-", "")}`;
  const test = new URL(admin.toString());
  test.pathname = `/${name}`;

  const setup = new pg.Pool({ connectionString: admin.toString() });
  try {
    await setup.query(`create database ${name}`);
  } finally {
    await setup.end();
  }

  process.env.DATABASE_URL = test.toString();
  delete process.env.DATABASE_URL_UNPOOLED;

  try {
    const { ensureCatalog, getProducts } = await import("@/lib/store");
    const { databaseReadiness } = await import("@/db/bootstrap");
    const { closePool } = await import("@/db");
    await ensureCatalog();
    const products = await getProducts();
    const readiness = await databaseReadiness();
    if (!readiness.ready) throw new Error(`Missing tables: ${readiness.missing.join(", ")}`);
    if (products.length !== 30) throw new Error(`Expected 30 products, got ${products.length}`);
    console.log(`Automatic bootstrap created ${readiness.existing.length} tables and seeded ${products.length} products.`);
    await closePool();
  } finally {
    const cleanup = new pg.Pool({ connectionString: admin.toString() });
    try {
      await cleanup.query(`drop database if exists ${name} with (force)`);
    } finally {
      await cleanup.end();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
