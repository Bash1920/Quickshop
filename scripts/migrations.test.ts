import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { sql } from "drizzle-orm";
import { loadDeploymentEnvironment } from "./deployment-config";

test("initial migrations create all tables and can be safely rerun", {
  skip: process.env.QUICKSHOP_DB_TESTS !== "1",
  timeout: 60_000,
}, async () => {
  loadDeploymentEnvironment();
  const original = new URL(process.env.DATABASE_URL ?? "");
  assert(["localhost", "127.0.0.1", "[::1]"].includes(original.hostname), "Migration integration tests are restricted to a local PostgreSQL server.");
  assert.notEqual(process.env.VERCEL, "1", "Never run disposable database tests in a Vercel deployment.");

  const { db, pool } = await import("@/db");
  const name = `quickshop_migration_test_${randomUUID().replaceAll("-", "")}`;
  const temporary = new URL(original);
  temporary.pathname = `/${name}`;
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: temporary.toString(),
    DATABASE_URL_UNPOOLED: "",
    QUICKSHOP_RUN_MIGRATIONS: "0",
  };
  let created = false;

  function run(script: string) {
    const result = spawnSync(process.execPath, ["--import", "tsx", script], {
      env: environment,
      encoding: "utf8",
      timeout: 20_000,
    });
    assert.ifError(result.error);
    return { status: result.status, output: `${result.stdout}\n${result.stderr}` };
  }

  try {
    await db.execute(sql`create database ${sql.identifier(name)}`);
    created = true;
    const empty = run("scripts/check-deployment.ts");
    assert.equal(empty.status, 1);
    assert.match(empty.output, /tables are missing/);

    const first = run("scripts/migrate.ts");
    assert.equal(first.status, 0, first.output);
    assert.match(first.output, /migrations applied successfully/);

    const ready = run("scripts/check-deployment.ts");
    assert.equal(ready.status, 0, ready.output);
    assert.match(ready.output, /all 8 required tables/);

    const repeated = run("scripts/migrate.ts");
    assert.equal(repeated.status, 0, repeated.output);
    const stillReady = run("scripts/check-deployment.ts");
    assert.equal(stillReady.status, 0, stillReady.output);
  } finally {
    try {
      if (created) {
        // Only drop the uniquely named database created by this test.
        await db.execute(sql`drop database ${sql.identifier(name)} with (force)`);
      }
    } finally {
      await pool.end();
    }
  }
});
