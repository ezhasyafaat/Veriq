-- Tenant isolation (SEC-1, PRD §11.2). RLS on every org-scoped table.
-- The veriq_app runtime role is not the table owner, so RLS applies to it.
-- The owner role (migrations, auth module session store) bypasses RLS.
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "organizations" FOR ALL TO veriq_app USING (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid) WITH CHECK (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "workspaces" FOR ALL TO veriq_app USING (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid) WITH CHECK (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "teams" FOR ALL TO veriq_app USING (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid) WITH CHECK (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "users" FOR ALL TO veriq_app USING (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid) WITH CHECK (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation" ON "memberships" FOR ALL TO veriq_app USING (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid) WITH CHECK (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
-- Audit log is append-only (CORE-OB-2): select and insert only, no update or
-- delete policy, and the privileges are revoked outright.
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "audit_insert" ON "audit_log" FOR INSERT TO veriq_app WITH CHECK (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
CREATE POLICY "audit_select" ON "audit_log" FOR SELECT TO veriq_app USING (organization_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
REVOKE UPDATE, DELETE ON "audit_log" FROM veriq_app;--> statement-breakpoint
-- Sessions are owned by the auth module on the owner connection. The app
-- role gets nothing, so session tokens cannot be reached through it.
REVOKE ALL ON "sessions" FROM veriq_app;
