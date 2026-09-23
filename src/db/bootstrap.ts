import { getTableName, sql } from "drizzle-orm";
import { db, getPool } from "@/db";
import * as schema from "./schema";

export const requiredTables = Object.values(schema).map((table) => getTableName(table));

const initialSchemaSql = `
create table if not exists "products" (
  "id" integer primary key,
  "name" text not null,
  "brand" text not null,
  "category" text not null,
  "price" integer not null,
  "original_price" integer not null,
  "rating" double precision not null,
  "reviews" integer not null,
  "image" text not null,
  "images" jsonb not null,
  "description" text not null,
  "details" jsonb not null,
  "badge" text not null default '',
  "featured" boolean not null default false,
  "stock" integer not null default 50
);

create table if not exists "customers" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "email" text not null,
  "password_hash" text not null,
  "created_at" timestamp not null default now(),
  constraint "customers_email_unique" unique ("email")
);

create table if not exists "shop_sessions" (
  "id" text primary key,
  "customer_id" uuid references "public"."customers"("id") on delete no action on update no action,
  "expires_at" timestamp not null
);

create table if not exists "cart_items" (
  "session_id" text not null,
  "product_id" integer not null references "public"."products"("id") on delete no action on update no action,
  "quantity" integer not null default 1,
  constraint "cart_items_session_id_product_id_pk" primary key ("session_id", "product_id")
);

create table if not exists "wishlist_items" (
  "session_id" text not null,
  "product_id" integer not null references "public"."products"("id") on delete no action on update no action,
  constraint "wishlist_items_session_id_product_id_pk" primary key ("session_id", "product_id")
);

create table if not exists "orders" (
  "id" uuid primary key default gen_random_uuid(),
  "session_id" text not null,
  "customer_id" uuid references "public"."customers"("id") on delete no action on update no action,
  "customer_name" text not null,
  "email" text not null,
  "phone" text not null,
  "address" text not null,
  "city" text not null,
  "pincode" text not null,
  "total" integer not null,
  "delivery_fee" integer not null default 0,
  "payment_method" text not null default 'Cash on delivery',
  "status" text not null default 'Confirmed',
  "items" jsonb not null,
  "created_at" timestamp not null default now()
);

create table if not exists "seller_applications" (
  "id" uuid primary key default gen_random_uuid(),
  "business_name" text not null,
  "email" text not null,
  "phone" text not null,
  "category" text not null,
  "created_at" timestamp not null default now()
);

create table if not exists "subscribers" (
  "email" text primary key,
  "created_at" timestamp not null default now()
);
`;

function parseConnectionString(value: string | undefined) {
  if (!value?.trim()) return null;
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function isPooled(url: URL) {
  return url.hostname.split(".")[0].endsWith("-pooler");
}

function unpooled(url: URL) {
  const copy = new URL(url.toString());
  copy.hostname = copy.hostname.replace("-pooler", "");
  return copy;
}

function sameEndpoint(a: URL, b: URL) {
  const normalize = (url: URL) =>
    `${url.hostname.replace("-pooler", "")}:${url.port || "5432"}${url.pathname}`;
  return normalize(a) === normalize(b);
}

export function getDirectConnectionUrl() {
  const pooled = parseConnectionString(process.env.DATABASE_URL);
  if (!pooled) return null;
  const explicitDirect = parseConnectionString(process.env.DATABASE_URL_UNPOOLED);
  if (explicitDirect && (!explicitDirect.hostname.endsWith(".neon.tech") || sameEndpoint(pooled, explicitDirect))) {
    return explicitDirect.toString();
  }
  if (pooled.hostname.endsWith(".neon.tech") && isPooled(pooled)) {
    return unpooled(pooled).toString();
  }
  return pooled.toString();
}

async function findMissingTables() {
  const result = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name in (${sql.join(requiredTables.map((name) => sql`${name}`), sql`, `)})
  `);
  const existing = new Set(result.rows.map((row) => row.table_name));
  return requiredTables.filter((name) => !existing.has(name));
}

let schemaPromise: Promise<void> | undefined;

/**
 * Idempotent first-run setup for hosted deployments. This lets a user connect
 * Neon by setting DATABASE_URL in Vercel without manually running migrations.
 * DDL intentionally uses a direct connection when the runtime URL is pooled.
 */
export function ensureDatabase() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const missing = await findMissingTables();
      if (missing.length === 0) return;

      const directUrl = getDirectConnectionUrl();
      const directPool = getPool(directUrl ?? undefined);
      try {
        await directPool.query(initialSchemaSql);
      } finally {
        if (directUrl && directUrl !== process.env.DATABASE_URL?.trim()) {
          await directPool.end().catch(() => undefined);
        }
      }

      const remaining = await findMissingTables();
      if (remaining.length > 0) {
        throw new Error(`QuickShop database setup incomplete. Missing tables: ${remaining.join(", ")}`);
      }
    })().catch((error) => {
      schemaPromise = undefined;
      throw error;
    });
  }
  return schemaPromise;
}

export async function databaseReadiness() {
  await ensureDatabase();
  const missing = await findMissingTables();
  return { ready: missing.length === 0, missing, existing: requiredTables.filter((name) => !missing.includes(name)) };
}
