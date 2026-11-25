import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

export interface TestDb {
  ownerUri: string;
  appUri: string;
  container: StartedPostgreSqlContainer;
}

/**
 * Starts a throwaway Postgres with the veriq_app role (init script) so the
 * RLS migration can run and the runtime role can be exercised. Sets
 * DATABASE_OWNER_URL / DATABASE_URL in the process env; import app modules
 * only after calling this.
 */
export async function startTestDb(): Promise<TestDb> {
  const initSql = readFileSync(path.resolve(import.meta.dirname, '../../db/init/01-app-role.sql'), 'utf8');
  const dir = mkdtempSync(path.join(tmpdir(), 'veriq-init-'));
  const initFile = path.join(dir, '01-app-role.sql');
  writeFileSync(initFile, initSql);
  try {
    const container = await new PostgreSqlContainer('pgvector/pgvector:pg17')
      .withCopyFilesToContainer([{ source: initFile, target: '/docker-entrypoint-initdb.d/01-app-role.sql' }])
      .start();
    const ownerUri = container.getConnectionUri();
    const appUri = ownerUri.replace(/postgres:\/\/[^@]*@/, 'postgres://veriq_app:veriq_app@');
    process.env.DATABASE_OWNER_URL = ownerUri;
    process.env.DATABASE_URL = appUri;
    return { ownerUri, appUri, container };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
