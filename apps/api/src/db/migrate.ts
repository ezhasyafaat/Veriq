import path from 'node:path';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { getAuthDb, getOwnerSql } from './client';

// Runs on the owner connection: the runtime role cannot create tables.
export async function runMigrations() {
  const migrationsFolder = path.resolve(import.meta.dirname, '../../drizzle');
  await migrate(getAuthDb(), { migrationsFolder });
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.filename === path.resolve(process.argv[1]);

if (invokedDirectly) {
  runMigrations()
    .then(async () => {
      await getOwnerSql().end();
      console.log('migrations applied');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
