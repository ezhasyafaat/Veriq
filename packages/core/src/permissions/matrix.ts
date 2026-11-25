import type { UserRole } from '@veriq/contracts';

export const PLATFORMS = ['business', 'intelligence', 'engineering'] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface RoleCapabilities {
  platforms: Platform[];
  /** Permission strings; '*' matches everything, 'prefix:*' matches a namespace. */
  permissions: string[];
}

// PRD §11.2 default roles. Org Admin holds everything; every other role is a
// deliberate subset so the three-layer check has real decisions to make.
export const ROLE_MATRIX: Record<UserRole, RoleCapabilities> = {
  org_admin: {
    platforms: ['business', 'intelligence', 'engineering'],
    permissions: ['*'],
  },
  workspace_admin: {
    platforms: ['business'],
    permissions: ['workspace.*', 'transaction.read', 'logs.search', 'metrics.read', 'documents.read', 'escalation.send'],
  },
  agent_builder: {
    platforms: ['business', 'engineering'],
    permissions: ['tools.build', 'tools.test', 'transaction.read', 'logs.search', 'metrics.read'],
  },
  member: {
    platforms: ['business'],
    permissions: ['transaction.read', 'logs.search', 'metrics.read', 'documents.read', 'escalation.send'],
  },
  viewer_auditor: {
    platforms: ['business'],
    permissions: ['transaction.read', 'logs.search', 'metrics.read', 'documents.read', 'audit.read'],
  },
};
