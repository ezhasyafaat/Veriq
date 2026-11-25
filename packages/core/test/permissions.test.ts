import { describe, expect, it } from 'vitest';
import { ROLE_MATRIX, PLATFORMS, type Platform } from '../src/permissions/matrix';
import { decideAccess } from '../src/permissions/decision';
import type { UserRole } from '@veriq/contracts';

const ROLES: UserRole[] = ['org_admin', 'workspace_admin', 'agent_builder', 'member', 'viewer_auditor'];

describe('role matrix', () => {
  it('covers every default role from PRD §11.2', () => {
    for (const role of ROLES) {
      expect(ROLE_MATRIX[role], role).toBeDefined();
      expect(ROLE_MATRIX[role].platforms.length, role).toBeGreaterThan(0);
    }
  });

  it('only references known platforms', () => {
    for (const role of ROLES) {
      for (const platform of ROLE_MATRIX[role].platforms) {
        expect(PLATFORMS, `${role}:${platform}`).toContain(platform);
      }
    }
  });
});

describe('decideAccess: platform layer', () => {
  it('member may use business but not engineering', () => {
    expect(decideAccess({ role: 'member', platform: 'business' }).allowed).toBe(true);
    expect(decideAccess({ role: 'member', platform: 'engineering' }).allowed).toBe(false);
  });

  it('org admin may use every platform', () => {
    for (const platform of PLATFORMS as readonly Platform[]) {
      expect(decideAccess({ role: 'org_admin', platform }).allowed).toBe(true);
    }
  });

  it('viewer_auditor is read-only but can read audit', () => {
    expect(decideAccess({ role: 'viewer_auditor', platform: 'business', permission: 'audit.read' }).allowed).toBe(true);
    expect(decideAccess({ role: 'viewer_auditor', platform: 'business', permission: 'escalation.send' }).allowed).toBe(false);
  });
});

describe('decideAccess: permission layer', () => {
  it('member may read transactions but not manage workspaces', () => {
    expect(decideAccess({ role: 'member', platform: 'business', permission: 'transaction.read' }).allowed).toBe(true);
    expect(decideAccess({ role: 'member', platform: 'business', permission: 'workspace.invite' }).allowed).toBe(false);
  });

  it('workspace_admin wildcard covers the workspace namespace', () => {
    expect(decideAccess({ role: 'workspace_admin', platform: 'business', permission: 'workspace.invite' }).allowed).toBe(true);
    expect(decideAccess({ role: 'workspace_admin', platform: 'business', permission: 'workspace.delete_org' }).allowed).toBe(true);
  });

  it('org admin wildcard allows any permission', () => {
    expect(decideAccess({ role: 'org_admin', platform: 'engineering', permission: 'infra.restart' }).allowed).toBe(true);
  });

  it('unknown role is denied, never throws', () => {
    const decision = decideAccess({ role: 'ghost' as UserRole, platform: 'business' });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('unknown role');
  });

  it('denials name the layer that failed', () => {
    const decision = decideAccess({ role: 'member', platform: 'engineering' });
    expect(decision.reason).toContain('platform');
    const tool = decideAccess({ role: 'member', platform: 'business', permission: 'tools.build' });
    expect(tool.reason).toContain('tools.build');
  });
});
