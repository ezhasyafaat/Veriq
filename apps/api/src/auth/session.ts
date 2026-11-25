import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, lt } from 'drizzle-orm';
import { sessions, users, type Db } from '@veriq/core';
import type { UserRole, DataScope } from '@veriq/contracts';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  sessionId: string;
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: UserRole;
  dataScope: DataScope;
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(authDb: Db, userId: string, organizationId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const [row] = await authDb
    .insert(sessions)
    .values({ userId, organizationId, tokenHash: tokenHash(token), expiresAt })
    .returning();
  return { token, sessionId: row!.id, expiresAt };
}

export async function validateSession(authDb: Db, token: string): Promise<SessionUser | null> {
  // opportunistic purge of expired sessions
  await authDb.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  const [row] = await authDb
    .select({
      sessionId: sessions.id,
      id: users.id,
      organizationId: users.organizationId,
      email: users.email,
      name: users.name,
      role: users.role,
      dataScope: users.dataScope,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())));

  return row ?? null;
}

export async function destroySession(authDb: Db, token: string): Promise<void> {
  await authDb.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
}
