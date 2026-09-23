# QuickShop on Vercel + Neon

## What is already configured

- `vercel.json`: Next.js, reproducible dependency installation, Fluid Compute, and a plain `npx next build` so Vercel can publish even before the database is connected.
- `src/db/index.ts`: a reusable PostgreSQL pool attached to Vercel's connection lifecycle. Application requests use the pooled Neon URL; TLS settings come from that URL. Importing the DB module never throws during builds — the friendly missing-DATABASE_URL error only appears when a query actually runs.
- `drizzle/`: the checked-in initial migration for all eight QuickShop tables.
- `scripts/migrate.ts`: an explicit migration command using Drizzle and the direct Neon URL. It refuses to modify existing QuickShop tables that have no migration history.
- `scripts/check-deployment.ts`: validates connection settings and verifies the required database tables without changing the schema.
- `.gitignore` and `.vercelignore`: exclude local credentials and build/test artifacts.

**Cloud account linking is not done by these files.** Import the repository into your own Vercel account and authorize its Neon integration. No Vercel token or Neon API key belongs in the running app.

## Recommended setup: Vercel's Neon integration

### 1. Import QuickShop

Upload the complete source to a GitHub repository, including `public/`, `scripts/`, `drizzle/`, `vercel.json`, and `package-lock.json`. Never upload `.env` or `.env.local`.

In Vercel, choose **Add New → Project** and import the repository. Use the repository root as the Root Directory and select **Node.js 22.x** in the project's build settings. The framework, install command, and build command come from `vercel.json`; do not replace the build command with a static export or `drizzle-kit push`.

If Vercel builds before the database is connected, the build still succeeds and the storefront renders its built-in catalog. Cart, login and orders will return a clear “Database is not connected yet” message until you connect Neon in step 2 and redeploy; do not add dummy credentials to work around it. Use `/api/health` to confirm when the database is ready.

### 2. Connect Neon

1. Open **Storage / Marketplace** in Vercel and add **Neon Postgres**.
2. Create a new database for this store, or connect an existing Neon project through the appropriate Neon integration. Review the provider's plan and billing before creating paid resources.
3. Choose a Neon region close to your Vercel Functions region. Region selection remains in your dashboard so you can match it to your account and customers.
4. Select **Connect Project**, choose QuickShop, and enable the **Production** environment.
5. Use the integration's default environment variable names (no custom prefix). Verify that it provides:
   - `DATABASE_URL`: pooled URL; the endpoint hostname contains `-pooler`.
   - `DATABASE_URL_UNPOOLED`: direct URL to the **same endpoint and database**.
6. Keep the provider-supplied TLS options, such as `sslmode=require`. Do not expose these values through `NEXT_PUBLIC_` variables.

The Vercel-managed integration can create a Neon account/project and supply the connection variables. If you already have a Neon account, the Neon-managed integration can connect it instead. Use only one of these integration types for the project.

QuickShop has its own account/login system; you do not need to enable Neon Auth for this app.

### 3. Initialize the new database and deploy

For a **new, empty Neon database**, add this non-secret environment variable to QuickShop's **Production** environment in Vercel:

| Name | Value |
| --- | --- |
| `QUICKSHOP_RUN_MIGRATIONS` | `1` |

Redeploy from Vercel's Deployments page. The configured build will:

1. Check that the Neon URLs are valid, use TLS, and point to the same database.
2. Apply the checked-in Drizzle migrations through the direct connection.
3. Verify all eight required application tables through the runtime connection.
4. Build Next.js and publish the deployment if every check passes.

The first page load adds the 30 sample products without overwriting existing product rows. Your sandbox accounts, carts, and orders are not copied to Neon.

After the first successful deployment, set `QUICKSHOP_RUN_MIGRATIONS` to `0` and redeploy if you want builds to be read-only. You can leave it at `1` only if reviewed, version-controlled migrations are part of your release process. Drizzle records applied migrations and does not rerun them on normal subsequent deployments. Run schema-changing deployments sequentially, not concurrently.

**Existing database warning:** if the database was created using `drizzle-kit push`, it has no migration journal. Keep the flag at `0`; the build can use its existing tables. Before switching to migrations, take a backup and establish a reviewed baseline that matches the actual schema. Never delete customer tables, fake migration history, or use `--force` to bypass the guard.

### 4. Verify the published URL

- `/api/health` must return HTTP 200 with `ok: true`, database `connected`, and `checks.schema: "ready"`. If it says `"not_initialized"`, the database is reachable but tables are missing — run the migration step.
- `/api/store` must return the catalog rather than an error. A successful database connection alone is not enough if tables are missing.
- Test signup/login, wishlist, cart persistence, and a demo checkout over HTTPS.
- Test in a private browser window. If visitors see Vercel's login page instead of QuickShop, review **Deployment Protection** for the intended public production deployment; preview protection can remain enabled.
- Check Vercel's Runtime Logs and Neon's monitoring if a request fails. Never paste full connection strings into public support requests.

Vercel provides a `vercel.app` address with HTTPS. To use your own domain, open **Settings → Domains**, add a domain you own, and use the exact DNS values Vercel gives you. Preserve email/MX records.

## Preview environments

Prefer isolated database branches rather than giving every preview the production connection string.

In the Neon integration's deployment configuration, enable **Preview branching** and **Resource must be active before deployment**. The integration injects each preview's connection URLs. Preview branches can inherit production data: use sanitized/test-only data and keep previews access-controlled. Do not expose production customer data to untrusted pull requests.

Set `QUICKSHOP_RUN_MIGRATIONS=1` for **Preview** only when you want reviewed migrations applied to each isolated preview branch. Do not manually pin a production `DATABASE_URL_UNPOOLED` alongside an injected preview `DATABASE_URL`; the build rejects mismatched endpoints.

## Manual connection / local verification

If you prefer not to authorize an integration, create the Neon database yourself and add the same environment variables under **Vercel → Project → Settings → Environment Variables**. New values apply to new deployments, so redeploy after saving.

On your own machine, configure `.env.local` using `.env.example`, then:

```sh
npm ci
node --import tsx scripts/check-deployment.ts --cloud
```

For a new, empty database, run the migration once before checking:

```sh
node --import tsx scripts/migrate.ts
node --import tsx scripts/check-deployment.ts --cloud
```

The check command never changes the schema. It intentionally fails when a local sandbox URL is used with `--cloud`.

To run the exact configured build locally with your current database:

```sh
node --import tsx scripts/vercel-build.ts
```

Keep `QUICKSHOP_RUN_MIGRATIONS=0` when checking the existing sandbox database. `.env.local` is used only outside Vercel; hosted builds use the project's injected environment variables and cannot silently fall back to a developer's local secret file.

## Future schema changes

1. Change `src/db/schema.ts` on a development branch.
2. Generate a migration with `npx drizzle-kit generate --name=describe_your_change`.
3. Review and commit the generated SQL and Drizzle metadata together.
4. Test on an isolated Neon branch with a backup/restore plan.
5. Run the migration once as part of a coordinated deployment. With automatic migrations disabled, run `scripts/migrate.ts` from a trusted environment before deploying compatible app code.

Never run `drizzle-kit push` automatically in production builds. Use backwards-compatible migrations because the previous application version may still serve traffic while a new build runs. Reverting app code does not roll back database changes.

## Troubleshooting

| Build or health result | Fix |
| --- | --- |
| `/api/health` says DATABASE_URL is not set (or `/api/store` returns 503 “Database is not connected yet”) | Connect Neon to the correct Vercel project/environment using default variable names, then redeploy. The Vercel build itself succeeds without the database so you can iterate. |
| Local/sandbox database rejected | Replace the localhost URL in Vercel with Neon's pooled cloud URL. |
| Direct migration URL missing | Connect/add `DATABASE_URL_UNPOOLED` for the same Neon database. |
| Production/preview endpoint mismatch | Remove conflicting manual variables and let the integration supply both URLs for that environment. |
| TLS setting missing | Copy the complete provider connection string, including its SSL/TLS query parameters. |
| Required tables missing | For a new empty database, enable migrations or run the explicit migration command. |
| Existing tables without migration history | Leave migrations disabled and plan a reviewed baseline with a backup; do not reset the database. |
| Health returns database unavailable | Check Neon compute status, credentials, permissions, and Vercel logs. |
| Migration failed | Check for an incompatible schema or overlapping migrations. Restore/retry through your release process; never force-drop tables. |

## Scope and costs

QuickShop is still a demo: cash-on-delivery checkout stores orders but does not ship products or collect money. Newsletter/seller forms store submissions without sending email. A real retail launch still needs payments/fulfillment as appropriate, legal policies, operational tools, monitoring, backups, and a security review.

Vercel Hobby is limited to personal, non-commercial use. Select a plan that permits your intended business use, and review Neon usage limits and domain costs separately.

## Official references

- [Vercel configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Vercel database pooling](https://vercel.com/kb/guide/connection-pooling-with-functions)
- [Vercel-managed Neon integration](https://neon.com/docs/guides/vercel-managed-integration)
- [Existing Neon account integration](https://neon.com/docs/guides/neon-managed-vercel-integration)
- [Neon pooled/direct connections](https://neon.com/docs/connect/connection-pooling)
- [Drizzle migrations](https://orm.drizzle.team/docs/drizzle-kit-migrate)
