import type { UserRole } from '@veriq/contracts';
import type { Platform } from './matrix';
import { ROLE_MATRIX } from './matrix';

export interface AccessRequest {
  role: UserRole;
  platform: Platform;
  /** Tool permission, e.g. 'transaction.read'. Omit to check platform access only. */
  permission?: string;
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
}

function permissionMatches(granted: string, requested: string): boolean {
  if (granted === '*' || granted === requested) {
    return true;
  }
  if (granted.endsWith('.*')) {
    return requested.startsWith(granted.slice(0, -1));
  }
  return false;
}

/**
 * Three-layer check, layers 1 and 2 (PRD §11.2). Layer 3, data scope, is
 * applied at query time by withDataScope, never as a post-filter.
 * Pure function: no I/O, no context beyond the request.
 */
export function decideAccess({ role, platform, permission }: AccessRequest): AccessDecision {
  const capabilities = ROLE_MATRIX[role];
  if (!capabilities) {
    return { allowed: false, reason: `unknown role: ${role}` };
  }
  if (!capabilities.platforms.includes(platform)) {
    return { allowed: false, reason: `role ${role} may not use the ${platform} platform` };
  }
  if (permission !== undefined && !capabilities.permissions.some((g) => permissionMatches(g, permission))) {
    return { allowed: false, reason: `role ${role} may not use ${permission}` };
  }
  return { allowed: true, reason: 'ok' };
}
