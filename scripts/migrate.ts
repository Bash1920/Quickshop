import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DeploymentConfigError, deploymentConfiguration, loadDeploymentEnvironment, reportDeploymentFailure } from "./deployment-config";

async function main() {
  loadDeploymentEnvironment();
  const settings = deploymentConfiguration(process.env, { migration: true });
  // Only this short-lived process uses the direct connection. The web app
  // continues to use DATABASE_URL's pooled endpoint.
  process.env.DATABASE_URL = settings.migrationUrl;
  const { db, pool } = await import("@/db");

  try {
    const { databaseReadiness } = await import("@/db/readiness");
    const status = await databaseReadiness();
    const journal = await db.execute<{ journal: string | null }>(sql`
      select to_regclass('drizzle.__drizzle_migrations')::text as journal
    `);
    let hasMigrationHistory = false;
    if (journal.rows[0]?.journal) {
      const history = await db.execute<{ count: number }>(sql`
        select count(*)::int as count from drizzle.__drizzle_migrations
      `);
      hasMigrationHistory = history.rows[0].count > 0;
    }

    if (status.existing.length > 0 && !hasMigrationHistory) {
      throw new DeploymentConfigError(
        "Existing QuickShop tables were found without Drizzle migration history. No schema changes were made. Keep QUICKSHOP_RUN_MIGRATIONS=0 for this database and baseline its schema with a backup before enabling migrations. For a first deployment, use a new empty Neon database. See DEPLOYMENT.md.",
      );
    }

    console.log("QuickShop: applying checked-in Drizzle migrations…");
    await migrate(db, { migrationsFolder: resolve(process.cwd(), "drizzle") });
    const ready = await databaseReadiness();
    if (!ready.ready) {
      throw new DeploymentConfigError("Migrations finished but the required QuickShop tables are incomplete. Inspect the migration files before deploying.");
    }
    console.log("QuickShop: migrations applied successfully. Existing migration history is preserved.");
  } finally {
    await pool.end();
  }
}

main().catch(reportDeploymentFailure);
