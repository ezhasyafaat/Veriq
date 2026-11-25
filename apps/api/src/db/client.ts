import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@veriq/core';

// Two connections (SEC-1, PRD §11.2):
// - getDb: the limited runtime role; RLS applies, org set per transaction
// - getAuthDb: the owner role; migrations, seed, and the session store only.
//   Business queries must never use it.

let appClient: postgres.Sql | undefined;
let ownerClient: postgres.Sql | undefined;

export function getDb() {
  if (!appClient) {
    appClient = postgres(process.env.DATABASE_URL ?? 'postgres://veriq:veriq@localhost:5432/veriq');
  }
  return drizzle(appClient, { schema });
}

export function getAuthDb() {
  if (!ownerClient) {
    ownerClient = postgres(process.env.DATABASE_OWNER_URL ?? process.env.DATABASE_URL ?? 'postgres://veriq:veriq@localhost:5432/veriq');
  }
  return drizzle(ownerClient, { schema });
}

export function getSql() {
  getDb();
  return appClient!;
}

export function getOwnerSql() {
  getAuthDb();
  return ownerClient!;
}
