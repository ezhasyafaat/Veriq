import { createHash, randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { users, workspaces, withDataScope, recordAudit, type Db } from '@veriq/core';
import { getAuthDb } from '../db/client';
import { withOrg } from '../db/withOrg';
import { env, readOidcConfig } from '../env';
import { verifyPassword } from './password';
import { createSession, destroySession, validateSession, type SessionUser } from './session';
import { buildLoginUrl, exchangeCode, getDiscovery } from './oidc';

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}

const SESSION_COOKIE = 'veriq_session';
const OIDC_STATE_COOKIE = 'veriq_oidc_state';

function sessionCookieOpts(expires: Date) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: env.NODE_ENV === 'production',
    expires,
  };
}

async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | null> {
  if (!request.user) {
    await reply.code(401).send({ error: 'unauthorized' });
    return null;
  }
  return request.user;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.decorateRequest('user', null);

  app.addHook('onRequest', async (request) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      request.user = await validateSession(getAuthDb(), token);
    }
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = z
      .object({ email: z.string().email(), password: z.string().min(1) })
      .parse(request.body);

    const authDb = getAuthDb();
    const [user] = await authDb.select().from(users).where(eq(users.email, body.email));
    if (!user?.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      if (user) {
        await recordAudit(authDb, {
          organizationId: user.organizationId,
          actorUserId: user.id,
          action: 'auth.login_failed',
          targetType: 'user',
          targetId: user.id,
        });
      }
      return reply.code(401).send({ error: 'email atau password salah' });
    }

    const session = await createSession(authDb, user.id, user.organizationId);
    await recordAudit(authDb, {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'auth.login',
      targetType: 'session',
      targetId: session.sessionId,
    });
    // setCookie/clearCookie mutate the reply synchronously; awaiting them
    // would await Fastify's thenable reply and deadlock the handler.
    reply.setCookie(SESSION_COOKIE, session.token, sessionCookieOpts(session.expiresAt));
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  });

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) {
      await destroySession(getAuthDb(), token);
    }
    if (request.user) {
      await recordAudit(getAuthDb(), {
        organizationId: request.user.organizationId,
        actorUserId: request.user.id,
        action: 'auth.logout',
        targetType: 'session',
        targetId: request.user.sessionId,
      });
    }
    // setCookie/clearCookie mutate the reply synchronously; awaiting them
    // would await Fastify's thenable reply and deadlock the handler.
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/api/auth/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  });

  app.get('/api/auth/methods', async () => ({
    password: true,
    oidc: readOidcConfig() !== null,
  }));

  app.get('/api/auth/oidc/login', async (_request, reply) => {
    const config = readOidcConfig();
    if (!config) {
      return reply.code(404).send({ error: 'oidc not configured' });
    }
    const d = await getDiscovery(config);
    const state = randomBytes(16).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');

    reply.setCookie(OIDC_STATE_COOKIE, JSON.stringify({ state, verifier }), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
      maxAge: 600,
    });
    return reply.redirect(buildLoginUrl(config, d, { state, codeChallenge: challenge }));
  });

  app.get('/api/auth/oidc/callback', async (request, reply) => {
    const config = readOidcConfig();
    if (!config) {
      return reply.code(404).send({ error: 'oidc not configured' });
    }
    const query = z.object({ code: z.string(), state: z.string() }).parse(request.query);
    const stored = request.cookies[OIDC_STATE_COOKIE];
    if (!stored) {
      return reply.code(400).send({ error: 'missing oidc state' });
    }
    const { state, verifier } = z.object({ state: z.string(), verifier: z.string() }).parse(JSON.parse(stored));
    if (state !== query.state) {
      return reply.code(400).send({ error: 'oidc state mismatch' });
    }

    let email: string;
    try {
      email = await exchangeCode(config, await getDiscovery(config), query.code, verifier);
    } catch (err) {
      request.log.warn(err, 'oidc code exchange failed');
      return reply.code(400).send({ error: 'oidc exchange failed' });
    }

    const authDb = getAuthDb();
    const [user] = await authDb.select().from(users).where(eq(users.email, email));
    if (!user) {
      return reply.code(403).send({ error: `no account for ${email}` });
    }

    const session = await createSession(authDb, user.id, user.organizationId);
    await recordAudit(authDb, {
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'auth.login_oidc',
      targetType: 'session',
      targetId: session.sessionId,
    });
    reply.clearCookie(OIDC_STATE_COOKIE, { path: '/' });
    reply.setCookie(SESSION_COOKIE, session.token, sessionCookieOpts(session.expiresAt));
    return reply.redirect('/');
  });

  app.get('/api/workspaces', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }
    // Data scope as a mandatory query parameter (§11.2): conditions from
    // withDataScope are ANDed into the where clause, never applied after.
    const rows = await withOrg(user.organizationId, (tx: Db) =>
      tx
        .select({ id: workspaces.id, name: workspaces.name, region: workspaces.region })
        .from(workspaces)
        .where(and(...withDataScope(workspaces, user))),
    );
    return { workspaces: rows };
  });
}
