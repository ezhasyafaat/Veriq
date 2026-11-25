import { describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/db/migrate';
import { seed } from '../../src/db/seed';
import { startMockIdp } from '../helpers/mock-idp';
import { startTestDb } from '../helpers/test-db';

// CORE-ID-2: OIDC authorization code flow with PKCE against a mock IdP.

describe('oidc login (integration)', () => {
  it('completes the code flow and creates a session', async () => {
    await startTestDb();
    await runMigrations();
    await seed({
      orgName: 'SSO Org',
      orgSlug: 'sso-org',
      adminEmail: 'sso-user@test.local',
      adminName: 'SSO User',
      adminPassword: 'unused-password',
      workspaces: [],
    });

    const idp = await startMockIdp('sso-user@test.local');
    process.env.OIDC_ISSUER = idp.url;
    process.env.OIDC_CLIENT_ID = 'veriq';
    process.env.OIDC_CLIENT_SECRET = 'sso-secret';
    process.env.OIDC_REDIRECT_URI = 'http://127.0.0.1:9999/api/auth/oidc/callback';

    const { buildApp } = await import('../../src/index');
    const app = await buildApp();

    const methods = await app.inject({ method: 'GET', url: '/api/auth/methods' });
    expect(methods.json()).toEqual({ password: true, oidc: true });

    const login = await app.inject({ method: 'GET', url: '/api/auth/oidc/login' });
    expect(login.statusCode).toBe(302);
    const stateCookie = login.cookies.find((c) => c.name === 'veriq_oidc_state')!;
    expect(stateCookie).toBeTruthy();
    expect(login.headers.location).toContain(idp.url);
    expect(login.headers.location).toContain('code_challenge_method=S256');

    // follow the IdP authorize redirect manually
    const authorizeRes = await fetch(login.headers.location!, { redirect: 'manual' });
    const callbackUrl = authorizeRes.headers.get('location')!;
    expect(callbackUrl).toContain('/api/auth/oidc/callback');
    expect(callbackUrl).toContain('state=');

    const callback = await app.inject({
      method: 'GET',
      url: new URL(callbackUrl).pathname + new URL(callbackUrl).search,
      cookies: { veriq_oidc_state: stateCookie.value },
    });
    expect(callback.statusCode).toBe(302);
    expect(callback.headers.location).toBe('/');
    const sessionCookie = callback.cookies.find((c) => c.name === 'veriq_session')!;
    expect(sessionCookie).toBeTruthy();

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      cookies: { veriq_session: sessionCookie.value },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('sso-user@test.local');

    // code replay is rejected: the single-use code was consumed by the
    // successful callback above
    const replay = await app.inject({
      method: 'GET',
      url: new URL(callbackUrl).pathname + new URL(callbackUrl).search,
      cookies: { veriq_oidc_state: stateCookie.value },
    });
    expect(replay.statusCode).toBe(400);

    await app.close();
    await idp.stop();
  });

  it('unknown oidc user is refused', async () => {
    const idp = await startMockIdp('intruder@unknown.test');
    process.env.OIDC_ISSUER = idp.url;
    process.env.OIDC_CLIENT_ID = 'veriq';
    process.env.OIDC_CLIENT_SECRET = 'sso-secret';
    process.env.OIDC_REDIRECT_URI = 'http://127.0.0.1:9999/api/auth/oidc/callback';

    const { buildApp } = await import('../../src/index');
    const app = await buildApp();
    const login = await app.inject({ method: 'GET', url: '/api/auth/oidc/login' });
    const stateCookie = login.cookies.find((c) => c.name === 'veriq_oidc_state')!;
    const authorizeRes = await fetch(login.headers.location!, { redirect: 'manual' });
    const callbackUrl = authorizeRes.headers.get('location')!;

    const callback = await app.inject({
      method: 'GET',
      url: new URL(callbackUrl).pathname + new URL(callbackUrl).search,
      cookies: { veriq_oidc_state: stateCookie.value },
    });
    expect(callback.statusCode).toBe(403);
    await app.close();
    await idp.stop();
  });
});
