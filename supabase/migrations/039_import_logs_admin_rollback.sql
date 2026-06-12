-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK de 039_import_logs_admin.sql
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "import_logs_admin_all" ON import_logs;
