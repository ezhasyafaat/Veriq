import { describe, expect, it } from 'vitest';
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { withDataScope } from '../src/db/withDataScope';
import { teams, workspaces } from '../src/identity/schema';

const unscoped = pgTable('unscoped', {
  id: uuid('id').primaryKey(),
  name: text('name'),
});

describe('withDataScope', () => {
  const user = {
    organizationId: '00000000-0000-0000-0000-000000000001',
    dataScope: { regions: ['jakarta'] },
  };

  it('scopes every query to the organization (PRD §11.2 layer 3)', () => {
    const conditions = withDataScope(teams, user);
    expect(conditions).toHaveLength(1);
  });

  it('adds the region restriction when the table and the user both have one', () => {
    const conditions = withDataScope(workspaces, user);
    expect(conditions).toHaveLength(2);
  });

  it('omits the region restriction when the user scope is empty', () => {
    const unrestricted = { organizationId: user.organizationId, dataScope: { regions: [] } };
    expect(withDataScope(workspaces, unrestricted)).toHaveLength(1);
  });

  it('refuses tables without organization_id', () => {
    expect(() => withDataScope(unscoped, user)).toThrow('organization_id');
  });
});
