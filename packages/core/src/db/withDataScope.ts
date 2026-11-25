import { eq, getTableColumns, inArray, type Column, type SQL, type Table } from 'drizzle-orm';
import type { DataScope } from '@veriq/contracts';

export interface ScopedUser {
  organizationId: string;
  dataScope: DataScope;
}

type ScopedColumns = {
  organizationId: Column;
  region?: Column;
};

/**
 * Data scope as a mandatory query parameter (PRD §11.2). Returns WHERE
 * conditions that every query against an org-scoped table must AND together:
 * the organization, plus the region restriction when the user has one.
 * Throws for tables without organization_id so an unscoped query cannot be
 * assembled by accident.
 */
export function withDataScope(table: Table, user: ScopedUser): SQL[] {
  const columns = getTableColumns(table) as unknown as ScopedColumns;
  if (!columns.organizationId) {
    throw new Error('table has no organization_id column; cannot scope');
  }
  const conditions: SQL[] = [eq(columns.organizationId, user.organizationId)];
  if (columns.region && user.dataScope.regions.length > 0) {
    conditions.push(inArray(columns.region, user.dataScope.regions));
  }
  return conditions;
}
