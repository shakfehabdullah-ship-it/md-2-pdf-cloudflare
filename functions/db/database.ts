/**
 * Cloudflare D1 Database Helper
 * 
 * D1 is Cloudflare's SQLite database at the edge.
 * All operations are async (unlike the original sql.js/better-sqlite3).
 */

export type D1Database = import("@cloudflare/workers-types").D1Database;

/** Run a query that returns rows */
export async function query<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const stmt = db.prepare(sql).bind(...params);
  const result = await stmt.all();
  return (result.results ?? []) as T[];
}

/** Run a query that returns a single row */
export async function queryOne<T = Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  const stmt = db.prepare(sql).bind(...params);
  return (await stmt.first()) as T | null;
}

/** Run a query that modifies data (INSERT, UPDATE, DELETE) */
export async function run(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<{ success: boolean; meta: { changes: number; last_row_id: number } }> {
  const stmt = db.prepare(sql).bind(...params);
  return await stmt.run();
}

/** Batch multiple statements in a single transaction */
export async function batch(
  db: D1Database,
  statements: import("@cloudflare/workers-types").D1PreparedStatement[]
) {
  return await db.batch(statements);
}