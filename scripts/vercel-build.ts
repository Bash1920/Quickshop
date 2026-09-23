import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { DeploymentConfigError, deploymentConfiguration, loadDeploymentEnvironment, reportDeploymentFailure } from "./deployment-config";

function run(args: string[], label: string) {
  const child = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (child.error || child.status !== 0) {
    throw new DeploymentConfigError(`${label} failed. Deployment stopped; review the preceding check and DEPLOYMENT.md.`);
  }
}

try {
  loadDeploymentEnvironment();
  const settings = deploymentConfiguration();
  process.env.DATABASE_URL = settings.databaseUrl;
  console.log("QuickShop: validating the Vercel / Neon deployment.");

  if (settings.runMigrations) {
    run(["--import", "tsx", "scripts/migrate.ts"], "Database migration");
  } else {
    console.log("QuickShop: automatic migrations are disabled; the database will only be checked.");
  }

  run(["--import", "tsx", "scripts/check-deployment.ts"], "Database readiness check");
  const requireFromProject = createRequire(resolve(process.cwd(), "package.json"));
  run([requireFromProject.resolve("next/dist/bin/next"), "build"], "Next.js production build");
} catch (error) {
  reportDeploymentFailure(error);
}
