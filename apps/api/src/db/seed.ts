import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { organizations, users, workspaces, type Db } from '@veriq/core';
import type { UserRole } from '@veriq/contracts';
import { hashPassword } from '../auth/password';
import { getAuthDb, getOwnerSql } from './client';

export interface SeedInput {
  orgName: string;
  orgSlug: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
  workspaces: Array<{ name: string; region: string }>;
}

export async function seed(input: SeedInput) {
  const db: Db = getAuthDb();

  let [org] = await db.select().from(organizations).where(eq(organizations.slug, input.orgSlug));
  if (!org) {
    const id = randomUUID();
    [org] = await db
      .insert(organizations)
      .values({ id, organizationId: id, name: input.orgName, slug: input.orgSlug })
      .returning();
  }
  if (!org) {
    throw new Error(`failed to seed organization ${input.orgSlug}`);
  }

  let [admin] = await db.select().from(users).where(eq(users.email, input.adminEmail));
  if (!admin) {
    [admin] = await db
      .insert(users)
      .values({
        organizationId: org.id,
        email: input.adminEmail,
        name: input.adminName,
        role: 'org_admin' satisfies UserRole,
        passwordHash: await hashPassword(input.adminPassword),
        dataScope: { regions: [] },
      })
      .returning();
  }
  if (!admin) {
    throw new Error(`failed to seed admin user ${input.adminEmail}`);
  }

  for (const ws of input.workspaces) {
    const [existing] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.name, ws.name));
    if (!existing) {
      await db.insert(workspaces).values({
        organizationId: org.id,
        name: ws.name,
        region: ws.region,
      });
    }
  }

  return { org, admin };
}

export async function seedAndClose(input: SeedInput) {
  const result = await seed(input);
  await getOwnerSql().end();
  return result;
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === path.resolve(process.argv[1]);

if (invokedDirectly) {
  void seedAndClose({
    orgName: 'Veriq Demo',
    orgSlug: 'veriq-demo',
    adminEmail: 'admin@veriq-demo.local',
    adminName: 'Demo Admin',
    adminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'veriq-dev-admin',
    workspaces: [
      { name: 'JKT Support', region: 'jakarta' },
      { name: 'SBY Support', region: 'surabaya' },
    ],
  })
    .then(({ org, admin }) => {
      console.log(`seeded org=${org.slug} admin=${admin.email}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
