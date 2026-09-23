import assert from "node:assert/strict";
import test from "node:test";
import { DeploymentConfigError, deploymentConfiguration } from "./deployment-config";

// Fictional connection strings: these tests never contact a database.
const pooled = "postgresql://test_role:not-a-real-secret@ep-quickshop-example-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const direct = pooled.replace("-pooler", "");
const local = "postgresql://test_role:not-a-real-secret@127.0.0.1:5432/quickshop_test";
const environment = (overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  VERCEL: "1",
  DATABASE_URL: pooled,
  DATABASE_URL_UNPOOLED: direct,
  ...overrides,
});

test("accepts Neon integration variables and keeps migrations opt-in", () => {
  const result = deploymentConfiguration(environment());
  assert.equal(result.provider, "Neon");
  assert.equal(result.cloud, true);
  assert.equal(result.runMigrations, false);
  assert.equal(result.databaseUrl, pooled);
  assert.equal(result.migrationUrl, direct);
});

test("accepts an explicitly enabled migration with a matching direct URL", () => {
  assert.equal(deploymentConfiguration(environment({ QUICKSHOP_RUN_MIGRATIONS: "1" })).runMigrations, true);
});

test("allows a local development database without TLS or an extra direct URL", () => {
  const result = deploymentConfiguration({ NODE_ENV: "test", DATABASE_URL: local }, { migration: true });
  assert.equal(result.cloud, false);
  assert.equal(result.migrationUrl, local);
});

test("does not print malformed credentials in errors", () => {
  const secret = "not-a-real-url-containing-a-secret";
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL: secret })), (error) => {
    assert(error instanceof DeploymentConfigError);
    assert(!error.message.includes(secret));
    return true;
  });
});

test("missing and non-PostgreSQL runtime URLs fail with setup guidance", () => {
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL: undefined })), /DATABASE_URL is missing/);
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL: "https://example.com/database" })), /PostgreSQL URL/);
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL: "postgresql://example.com/" })), /database name/);
});

test("a Vercel deployment cannot accidentally target the sandbox", () => {
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL: local, DATABASE_URL_UNPOOLED: undefined })), /local\/sandbox/);
});

test("runtime connections must use Neon's pooler on Vercel", () => {
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL: direct })), /pooled connection string/);
});

test("Neon connections must retain TLS options", () => {
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL: pooled.replace("sslmode=require", "sslmode=disable") })), /TLS/);
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL_UNPOOLED: direct.split("?")[0] })), /TLS/);
});

test("a direct URL is optional until Neon migrations are requested", () => {
  assert.doesNotThrow(() => deploymentConfiguration(environment({ DATABASE_URL_UNPOOLED: undefined })));
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL_UNPOOLED: undefined, QUICKSHOP_RUN_MIGRATIONS: "1" })), /required for Neon migrations/);
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL_UNPOOLED: undefined }), { migration: true }), /required for Neon migrations/);
});

test("rejects pooled migration URLs and mismatched preview or production branches", () => {
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL_UNPOOLED: pooled })), /direct connection/);
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL_UNPOOLED: direct.replace("ep-quickshop-example", "ep-another-branch") })), /same Neon endpoint/);
  assert.throws(() => deploymentConfiguration(environment({ DATABASE_URL_UNPOOLED: direct.replace("/neondb?", "/otherdb?") })), /same Neon endpoint/);
});

test("the migration flag must be explicit", () => {
  assert.throws(() => deploymentConfiguration(environment({ QUICKSHOP_RUN_MIGRATIONS: "yes" })), /must be 0/);
});
