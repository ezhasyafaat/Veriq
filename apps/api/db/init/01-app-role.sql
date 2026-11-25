-- Runs once on first database init (docker-entrypoint-initdb.d).
-- The app connects as veriq_app (non-owner) so RLS policies apply.
CREATE ROLE veriq_app LOGIN PASSWORD 'veriq_app';
GRANT USAGE ON SCHEMA public TO veriq_app;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO veriq_app;
