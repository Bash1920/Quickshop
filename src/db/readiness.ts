import { getTableName, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const requiredTables = Object.values(schema).map((table) => getTableName(table));

export async function databaseReadiness() {
  const result = await db.execute<{ table_name: string }>(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
      and table_name in (${sql.join(requiredTables.map((name) => sql`${name}`), sql`, `)})
  `);
  const existing = new Set(result.rows.map((row) => row.table_name));
  const missing = requiredTables.filter((name) => !existing.has(name));
  return { ready: missing.length === 0, missing, existing: [...existing] };
}
