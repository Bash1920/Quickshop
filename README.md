# QuickShop

A responsive e-commerce demo built with Next.js App Router, React, PostgreSQL, and Drizzle ORM. Images and fonts are included in `public/`. Accounts, carts, wishlists, orders, seller applications, and newsletter signups are stored in PostgreSQL.

**Demo only:** checkout saves cash-on-delivery orders but does not collect money or ship products. Seller/newsletter forms save submissions but do not send email.

## Deploy on Vercel + Neon

**The project is configured for Vercel and Neon. Account linking must be completed in your own Vercel dashboard.** Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for the complete setup and troubleshooting guide.

1. Push the complete project to GitHub and import it into Vercel. Include `src/`, `public/`, `scripts/`, `drizzle/`, `vercel.json`, and the npm lockfile.
2. Add **Neon Postgres** through Vercel's Storage/Marketplace and connect it to QuickShop using the default `DATABASE_URL` and `DATABASE_URL_UNPOOLED` names.
3. For a **new empty database**, set `QUICKSHOP_RUN_MIGRATIONS=1` in the Production environment and deploy. For existing tables created with `drizzle-kit push`, leave migrations disabled until a reviewed baseline is established.
4. Verify the HTTPS URL and `/api/health`. Add your domain in Vercel's **Settings → Domains** if desired.

`vercel.json` selects Next.js, `npm ci --include=dev`, Fluid Compute, and `node --import tsx scripts/vercel-build.ts`. The build checks the connection settings and all required tables before building the app. Schema migrations are opt-in; the safe default is read-only validation. Set Node.js to **22.x** in Vercel's project settings and co-locate its Functions region with your Neon database.

You do not need a Vercel token, Neon API key, or Neon Auth in the running app. Authorize the integration in your account instead. Never share database credentials in chat or commit `.env` files. Both `.gitignore` and `.vercelignore` exclude local secrets.

The app cannot be hosted as a static-only site on GitHub Pages; it needs both a Next.js server and PostgreSQL. The workspace preview is not a substitute for a deployment maintained in your own account.

## Environment variables

Copy `.env.example` to `.env.local` for local development, or set the variables in Vercel's project environment.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required. Pooled PostgreSQL URL for application requests. Use Neon's complete URL, including TLS options. |
| `DATABASE_URL_UNPOOLED` | Direct URL to the same endpoint and database. Required when running Neon migrations. |
| `QUICKSHOP_RUN_MIGRATIONS` | `0` by default. Set to `1` to apply reviewed, checked-in migrations during the configured deployment build. |

Existing process environment variables take priority over `.env.local`, then `.env`, for local setup commands. On Vercel, deployment scripts use only the hosting environment; they do not load local dotenv files.

Separate production, development, and preview databases/branches. Never point untrusted preview code or browser regression tests at a real customer database.

## Local development

Use Node.js 22 (`nvm use` if nvm is installed), install dependencies, and configure a development PostgreSQL database in `.env.local`.

```sh
npm ci
```

For a **new, empty development database**, create the tables with the versioned migration:

```sh
node --import tsx scripts/migrate.ts
```

For an existing sandbox database, leave migrations disabled and verify its existing tables without modifying them:

```sh
node --import tsx scripts/check-deployment.ts
```

Then start development:

```sh
npm run dev
```

The app inserts its 30 sample products on first load without overwriting existing product rows. Sandbox users, carts, and orders are not automatically copied to a cloud database.

## Build and configuration checks

```sh
npm run lint
node --import tsx --test scripts/deployment-config.test.ts
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run build
```

To test the full Vercel build workflow with your local environment:

```sh
node --import tsx scripts/vercel-build.ts
```

To require cloud-ready Neon settings during the read-only database check:

```sh
node --import tsx scripts/check-deployment.ts --cloud
```

Health checks at `/api/health` verify both database connectivity and the presence of all required application tables, return HTTP 503 when unavailable/uninitialized, and disable caching.

A separate migration integration test can verify first-time setup and repeat runs against a local PostgreSQL server. It creates and deletes a uniquely named temporary database, requires a local role with database-creation privileges, and refuses remote database hosts. On macOS/Linux:

```sh
QUICKSHOP_DB_TESTS=1 node --import tsx --test scripts/migrations.test.ts
```

Do not run database integration tests as part of a hosted production build.

## Browser regression tests

With QuickShop already running against a development database:

```sh
npx playwright install --with-deps chromium
npx playwright test
```

The default suite checks desktop/mobile layouts, images, search, sorting, keyboard-controlled dialogs, and guest cart/wishlist persistence. It creates temporary shopping sessions but does not place orders.

The account/checkout test creates a demo account and order and decrements stock. Run it only against a disposable test database. On macOS/Linux:

```sh
QUICKSHOP_E2E_WRITES=1 npx playwright test
```

On PowerShell, set `$env:QUICKSHOP_E2E_WRITES="1"` before running `npx playwright test`. Set `PLAYWRIGHT_BASE_URL` to target an already running staging server instead of `http://localhost:3000`. Failure traces and screenshots are saved under the ignored `test-results/` directory.

## Security and production readiness

- Never upload `.env`, `.env.local`, local keys, `node_modules/`, or build output. If credentials have already been committed, rotate them and remove them from repository history; ignore rules do not remove tracked secrets.
- Run `npm audit --omit=dev` to check deployed dependencies. Avoid `npm audit fix --force`, which can install incompatible toolchain versions.
- Apply reviewed migrations with backups; do not run automated `drizzle-kit push --force` against real data. See the baseline guidance in [DEPLOYMENT.md](./DEPLOYMENT.md).
- Before accepting real orders, replace sample inventory/assets, add authorized staff tools, fulfillment and payment integrations as needed, transactional email, account recovery, abuse protection, monitoring, backups, and accurate business/privacy/return policies.
- Vercel Hobby is restricted to personal, non-commercial use. Review current Vercel and Neon plans for your intended business and traffic. A custom domain generally costs extra.
