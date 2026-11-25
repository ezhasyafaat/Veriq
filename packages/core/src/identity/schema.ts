import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { DataScope, UserRole } from '@veriq/contracts';

// CORE-ID-3: organization > workspace > team, department is an attribute.
// SEC-1: every record carries organization_id, enforced by RLS (see migration 0002).

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    name: text('name').notNull(),
    region: text('region').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('workspaces_org_idx').on(t.organizationId)],
);

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('teams_org_idx').on(t.organizationId)],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    role: text('role').$type<UserRole>().notNull(),
    // null when the user authenticates only via OIDC
    passwordHash: text('password_hash'),
    dataScope: jsonb('data_scope').$type<DataScope>().notNull().default({ regions: [] }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('users_org_idx').on(t.organizationId)],
);

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    workspaceId: uuid('workspace_id').references(() => workspaces.id),
    teamId: uuid('team_id').references(() => teams.id),
    role: text('role').$type<UserRole>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('memberships_org_idx').on(t.organizationId), index('memberships_user_idx').on(t.userId)],
);

// Accessed only through the owner connection (auth module); no grants for the
// app role, so RLS policies never need to cover session lookup.
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_expiry_idx').on(t.expiresAt)],
);

// CORE-OB-2: append-only. Migration 0002 revokes UPDATE and DELETE.
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    actorUserId: uuid('actor_user_id'),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_log_org_created_idx').on(t.organizationId, t.createdAt)],
);
