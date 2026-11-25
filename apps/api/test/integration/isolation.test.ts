import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, workspaces, withDataScope } from '@veriq/core';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { runMigrations } from '../../src/db/migrate';
import { startTestDb } from '../helpers/test-db';

// M1 exit criterion: zero cross-org access through the runtime role, proven
// in CI against a real Postgres with RLS (SEC-1, PRD §11.2).

describe('tenant isolation (integration)', () => {
  let appSql: postgres.Sql;
  let orgAId: string;
  let orgBId: string;

  beforeAll(async () => {
    const { ownerUri, appUri } = await startTestDb();
    await runMigrations();

    const ownerSql = postgres(ownerUri);
    const idA = randomUUID();
    const idB = randomUUID();
    await ownerSql`insert into organizations (id, organization_id, name, slug) values (${idA}, ${idA}, 'Org A', 'org-a'), (${idB}, ${idB}, 'Org B', 'org-b')`;
    await ownerSql`insert into users (organization_id, email, name, role, data_scope) values (${idA}, 'a-user@test.local', 'A User', 'member', ${JSON.stringify({ regions: ['jakarta'] })}::jsonb)`;
    await ownerSql`insert into workspaces (organization_id, name, region) values (${idA}, 'A Jakarta', 'jakarta'), (${idA}, 'A Surabaya', 'surabaya'), (${idB}, 'B Denpasar', 'denpasar')`;
    await ownerSql.end();

    appSql = postgres(appUri);
    orgAId = idA;
    orgBId = idB;
  });

  afterAll(async () => {
    await appSql.end();
  });

  function asTx(tx: postgres.TransactionSql<Record<string, unknown>> | postgres.TransactionSql<never>) {
    return tx as postgres.TransactionSql<never>;
  }

  it('returns only org A rows when app.current_org is set to A', async () => {
    const rows = await appSql.begin(async (tx) => {
      await asTx(tx)`select set_config('app.current_org', ${orgAId}, true)`;
      return tx`select name from workspaces order by name`;
    });
    expect(rows.map((r) => r.name)).toEqual(['A Jakarta', 'A Surabaya']);
  });

  it('returns zero rows when app.current_org is not set', async () => {
    const rows = await appSql`select * from workspaces`;
    expect(rows).toHaveLength(0);
  });

  it('blocks inserts into another org even with the local setting', async () => {
    await expect(
      appSql.begin(async (tx) => {
        await asTx(tx)`select set_config('app.current_org', ${orgAId}, true)`;
        await tx`insert into workspaces (organization_id, name, region) values (${orgBId}, 'Smuggled', 'jakarta')`;
      }),
    ).rejects.toThrow();
  });

  it('audit log accepts inserts but refuses updates and deletes (CORE-OB-2)', async () => {
    await appSql.begin(async (tx) => {
      await asTx(tx)`select set_config('app.current_org', ${orgAId}, true)`;
      await tx`insert into audit_log (organization_id, action, target_type) values (${orgAId}, 'test.event', 'test')`;
    });

    await expect(
      appSql.begin(async (tx) => {
        await asTx(tx)`select set_config('app.current_org', ${orgAId}, true)`;
        await tx`update audit_log set action = 'tampered'`;
      }),
    ).rejects.toThrow();
    await expect(
      appSql.begin(async (tx) => {
        await asTx(tx)`select set_config('app.current_org', ${orgAId}, true)`;
        await tx`delete from audit_log`;
      }),
    ).rejects.toThrow();
  });

  it('denies the runtime role any access to sessions', async () => {
    await expect(appSql`select * from sessions limit 1`).rejects.toThrow();
  });

  it('withDataScope filters by region through a real RLS-scoped query', async () => {
    const db = drizzle(appSql);
    const names = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_org', ${orgAId}, true)`);
      const [user] = await tx.select().from(users).where(eq(users.email, 'a-user@test.local'));
      const rows = await tx
        .select({ name: workspaces.name })
        .from(workspaces)
        .where(and(...withDataScope(workspaces, { organizationId: user!.organizationId, dataScope: user!.dataScope })));
      return rows.map((r) => r.name);
    });
    expect(names).toEqual(['A Jakarta']);
  });
});
