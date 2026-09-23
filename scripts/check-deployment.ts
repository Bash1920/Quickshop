import { DeploymentConfigError, deploymentConfiguration, loadDeploymentEnvironment, reportDeploymentFailure } from "./deployment-config";

async function main() {
  loadDeploymentEnvironment();
  const settings = deploymentConfiguration(process.env, process.argv.includes("--cloud") ? { cloud: true } : {});
  process.env.DATABASE_URL = settings.databaseUrl;
  console.log(`QuickShop: ${settings.provider} connection settings validated. Checking database tables…`);

  const { pool } = await import("@/db");
  try {
    const { databaseReadiness } = await import("@/db/readiness");
    const status = await databaseReadiness();
    if (!status.ready) {
      throw new DeploymentConfigError(
        `The database is reachable but QuickShop tables are missing: ${status.missing.join(", ")}. For a new empty database, enable QUICKSHOP_RUN_MIGRATIONS=1 in Vercel and redeploy, or run node --import tsx scripts/migrate.ts.`,
      );
    }
    console.log(`QuickShop: all ${status.existing.length} required tables are available. Deployment checks passed.`);
  } finally {
    await pool.end();
  }
}

main().catch(reportDeploymentFailure);
