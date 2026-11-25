import { sql } from 'drizzle-orm';
import type { Db } from '@veriq/core';

/**
 * Runs fn inside a transaction with app.current_org set (SET LOCAL), so RLS
 * policies on every org-scoped table apply for its duration. PRD §11.2.
 */
export async function withOrg<T>(orgId: string, fn: (tx: Db) => Promise<T>): Promise<T> {
  const { getDb } = await import('./client');
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.current_org', ${orgId}, true)`);
    return fn(tx as unknown as Db);
  });
}
