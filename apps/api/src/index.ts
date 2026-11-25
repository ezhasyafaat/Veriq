import path from 'node:path';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { recordAudit } from '@veriq/core';
import { authRoutes } from './auth/routes';
import { getAuthDb } from './db/client';
import { runMigrations } from './db/migrate';
import { seed } from './db/seed';
import { env } from './env';

const WEB_DIST = path.resolve(import.meta.dirname, '../../web/dist');

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cookie);
  await app.register(authRoutes);

  app.get('/health', async () => ({
    status: 'ok',
    service: 'veriq-api',
  }));

  try {
    await app.register(fastifyStatic, {
      root: WEB_DIST,
      prefix: '/',
    });
    app.setNotFoundHandler((request, reply) => {
      if (request.method === 'GET' && !request.url.startsWith('/api')) {
        return reply.sendFile('index.html');
      }
      return reply.code(404).send({ error: 'not found' });
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
    app.log.warn('apps/web/dist not found, serving API only');
  }

  return app;
}

async function start() {
  if (env.SEED_ON_BOOT) {
    await runMigrations();
    const { org, admin } = await seed({
      orgName: 'Veriq Demo',
      orgSlug: 'veriq-demo',
      adminEmail: 'admin@veriq-demo.local',
      adminName: 'Demo Admin',
      adminPassword: env.SEED_ADMIN_PASSWORD,
      workspaces: [
        { name: 'JKT Support', region: 'jakarta' },
        { name: 'SBY Support', region: 'surabaya' },
      ],
    });
    await recordAudit(getAuthDb(), {
      organizationId: org.id,
      actorUserId: admin.id,
      action: 'seed.boot',
      targetType: 'organization',
      targetId: org.id,
    });
  }

  const app = await buildApp();
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === path.resolve(process.argv[1]);

if (invokedDirectly) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
