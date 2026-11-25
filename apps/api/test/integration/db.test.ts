import { eq } from 'drizzle-orm';
import { organizations, users } from '@veriq/core';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/db/migrate';
import { seed } from '../../src/db/seed';
import { startTestDb } from '../helpers/test-db';

describe('database (integration)', () => {
  it('migrates and seeds one org with an admin user and workspaces', async () => {
    await startTestDb();
    await runMigrations();
    const { admin } = await seed({
      orgName: 'Veriq Demo',
      orgSlug: 'veriq-demo',
      adminEmail: 'admin@veriq-demo.local',
      adminName: 'Demo Admin',
      adminPassword: 'test-pass-123',
      workspaces: [{ name: 'JKT Support', region: 'jakarta' }],
    });

    const { getAuthDb } = await import('../../src/db/client');
    const db = getAuthDb();
    const [row] = await db.select().from(users).where(eq(users.email, admin.email));
    expect(row?.name).toBe('Demo Admin');
    expect(row?.role).toBe('org_admin');
    expect(row?.passwordHash).toBeTruthy();
    expect(row?.dataScope).toEqual({ regions: [] });

    const [orgRow] = await db.select().from(organizations).where(eq(organizations.slug, 'veriq-demo'));
    expect(orgRow?.name).toBe('Veriq Demo');
    expect(orgRow?.organizationId).toBe(orgRow?.id);
  });

  it('seed is idempotent', async () => {
    await seed({
      orgName: 'Veriq Demo',
      orgSlug: 'veriq-demo',
      adminEmail: 'admin@veriq-demo.local',
      adminName: 'Demo Admin',
      adminPassword: 'test-pass-123',
      workspaces: [{ name: 'JKT Support', region: 'jakarta' }],
    });

    const { getAuthDb } = await import('../../src/db/client');
    const db = getAuthDb();
    const rows = await db.select().from(organizations).where(eq(organizations.slug, 'veriq-demo'));
    expect(rows).toHaveLength(1);
  });
});
