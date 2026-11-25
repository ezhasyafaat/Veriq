import { eq } from 'drizzle-orm';
import { auditLog, users } from '@veriq/core';
import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/db/migrate';
import { seed } from '../../src/db/seed';
import { startTestDb } from '../helpers/test-db';

// CORE-ID-2: email/password login, session cookie, logout, audit trail.

describe('auth flow (integration)', () => {
  it('login, me, and logout with session cookie', async () => {
    await startTestDb();
    await runMigrations();
    await seed({
      orgName: 'Auth Org',
      orgSlug: 'auth-org',
      adminEmail: 'admin@auth.test',
      adminName: 'Auth Admin',
      adminPassword: 'correct-horse-battery',
      workspaces: [{ name: 'JKT Support', region: 'jakarta' }],
    });

    const { buildApp } = await import('../../src/index');
    const app = await buildApp();

    const wrong = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@auth.test', password: 'nope' },
    });
    expect(wrong.statusCode).toBe(401);

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@auth.test', password: 'correct-horse-battery' },
    });
    expect(login.statusCode).toBe(200);
    const cookie = login.cookies[0]!;
    expect(cookie.name).toBe('veriq_session');
    expect(cookie.httpOnly).toBe(true);

    const me = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: { [cookie.name]: cookie.value } });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('admin@auth.test');
    expect(me.json().user.role).toBe('org_admin');

    const anonymous = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(anonymous.statusCode).toBe(401);

    const workspaces = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
      cookies: { [cookie.name]: cookie.value },
    });
    expect(workspaces.statusCode).toBe(200);
    expect(workspaces.json().workspaces).toEqual([
      { id: expect.any(String), name: 'JKT Support', region: 'jakarta' },
    ]);

    const logout = await app.inject({ method: 'POST', url: '/api/auth/logout', cookies: { [cookie.name]: cookie.value } });
    expect(logout.statusCode).toBe(200);

    const afterLogout = await app.inject({ method: 'GET', url: '/api/auth/me', cookies: { [cookie.name]: cookie.value } });
    expect(afterLogout.statusCode).toBe(401);

    const { getAuthDb } = await import('../../src/db/client');
    const db = getAuthDb();
    const [user] = await db.select().from(users).where(eq(users.email, 'admin@auth.test'));
    expect(user?.passwordHash).not.toContain('correct-horse-battery');

    const audits = await db.select().from(auditLog).where(eq(auditLog.organizationId, user!.organizationId));
    const actions = audits.map((a) => a.action).sort();
    expect(actions).toEqual(['auth.login', 'auth.login_failed', 'auth.logout']);

    await app.close();
  });
});
