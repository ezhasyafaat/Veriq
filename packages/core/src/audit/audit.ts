import { auditLog } from '../identity/schema';
import type { Db } from '../db/types';

// CORE-OB-2: append-only audit entries for auth events, config, and
// permission changes. The DB role cannot UPDATE or DELETE here (migration 0002).

export interface AuditEntry {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  payload?: Record<string, unknown> | null;
}

export async function recordAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    organizationId: entry.organizationId,
    actorUserId: entry.actorUserId ?? null,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId ?? null,
    payload: entry.payload ?? null,
  });
}
