import { config } from "dotenv";

export class DeploymentConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentConfigError";
  }
}

export function loadDeploymentEnvironment() {
  // Vercel must use its linked project's secrets, never a developer's .env file.
  if (process.env.VERCEL !== "1") {
    config({ path: [".env.local", ".env"], quiet: true });
  }
}

function parseDatabaseUrl(value: string | undefined, name: string) {
  if (!value?.trim()) {
    throw new DeploymentConfigError(`${name} is missing. Connect Neon to this Vercel project with the default environment-variable names. See DEPLOYMENT.md.`);
  }
  let parsed: URL;
  try { parsed = new URL(value.trim()); }
  catch { throw new DeploymentConfigError(`${name} is not a valid PostgreSQL connection string. Copy the full string from Neon, without a psql command or surrounding quotes.`); }
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname || parsed.pathname.length < 2) {
    throw new DeploymentConfigError(`${name} must be a PostgreSQL URL containing a database name.`);
  }
  return parsed;
}

function isNeon(url: URL) {
  return url.hostname.endsWith(".neon.tech");
}

function isPooled(url: URL) {
  return url.hostname.split(".")[0].endsWith("-pooler");
}

function endpoint(url: URL) {
  return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
}

function checkNeonTls(url: URL, name: string) {
  if (isNeon(url) && !["require", "verify-ca", "verify-full"].includes(url.searchParams.get("sslmode") ?? "")) {
    throw new DeploymentConfigError(`${name} must retain Neon's TLS setting (sslmode=require or a stricter verification mode). Do not disable TLS.`);
  }
}

export function deploymentConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
  options: { cloud?: boolean; migration?: boolean } = {},
) {
  const cloud = options.cloud ?? environment.VERCEL === "1";
  const migrationSetting = environment.QUICKSHOP_RUN_MIGRATIONS?.trim() || "0";
  if (!["0", "1"].includes(migrationSetting)) {
    throw new DeploymentConfigError("QUICKSHOP_RUN_MIGRATIONS must be 0 (read-only build check) or 1 (apply reviewed migrations).");
  }
  const runMigrations = migrationSetting === "1";
  const pooled = parseDatabaseUrl(environment.DATABASE_URL, "DATABASE_URL");
  checkNeonTls(pooled, "DATABASE_URL");

  if (cloud && !isNeon(pooled)) {
    throw new DeploymentConfigError("This Vercel deployment is configured for Neon. Replace the local/sandbox DATABASE_URL with the pooled Neon connection string in Vercel Settings → Environment Variables.");
  }
  if (cloud && !isPooled(pooled)) {
    throw new DeploymentConfigError("Use Neon's pooled connection string for DATABASE_URL. Put its direct connection string in DATABASE_URL_UNPOOLED.");
  }

  const direct = environment.DATABASE_URL_UNPOOLED?.trim()
    ? parseDatabaseUrl(environment.DATABASE_URL_UNPOOLED, "DATABASE_URL_UNPOOLED")
    : null;
  if (direct) {
    checkNeonTls(direct, "DATABASE_URL_UNPOOLED");
    if (isNeon(direct) && isPooled(direct)) {
      throw new DeploymentConfigError("DATABASE_URL_UNPOOLED must use Neon's direct connection (turn Connection pooling off in the Neon Connect dialog).");
    }
    if (endpoint(direct) !== endpoint(pooled)) {
      throw new DeploymentConfigError("DATABASE_URL and DATABASE_URL_UNPOOLED must point to the same Neon endpoint and database. Do not mix production and preview branches.");
    }
  }
  if ((runMigrations || options.migration) && isNeon(pooled) && !direct) {
    throw new DeploymentConfigError("DATABASE_URL_UNPOOLED is required for Neon migrations. Connect the integration or add the direct URL for the same database.");
  }

  return {
    databaseUrl: pooled.toString(),
    migrationUrl: (direct ?? pooled).toString(),
    provider: isNeon(pooled) ? "Neon" : "PostgreSQL",
    runMigrations,
    cloud,
  };
}

export function reportDeploymentFailure(error: unknown) {
  if (error instanceof DeploymentConfigError) {
    console.error(`QuickShop setup: ${error.message}`);
  } else {
    // Driver errors can contain hostnames and SQL. Keep deployment output safe.
    console.error("QuickShop could not complete database setup. Check connectivity, database permissions, and DEPLOYMENT.md. Credentials have not been printed.");
  }
  process.exitCode = 1;
}
