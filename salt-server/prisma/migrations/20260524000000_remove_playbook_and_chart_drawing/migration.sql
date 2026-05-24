-- Remove strategy/playbook and chart drawing runtime surfaces from the database.
-- ExecutionLog remains as a generic investment action log, but it no longer links to playbook triggers.

ALTER TABLE "execution_logs" DROP CONSTRAINT IF EXISTS "execution_logs_trigger_id_fkey";
DROP INDEX IF EXISTS "playbook_triggers_user_id_status_idx";
DROP INDEX IF EXISTS "playbook_triggers_playbook_id_idx";
DROP INDEX IF EXISTS "investment_rules_playbook_id_idx";
DROP INDEX IF EXISTS "investment_playbooks_user_id_idx";
DROP INDEX IF EXISTS "chart_drawings_user_id_symbol_idx";
DROP INDEX IF EXISTS "chart_drawings_user_id_created_at_idx";
DROP INDEX IF EXISTS "chart_drawings_is_public_like_count_idx";

ALTER TABLE "execution_logs" DROP COLUMN IF EXISTS "trigger_id";

DROP TABLE IF EXISTS "playbook_triggers";
DROP TABLE IF EXISTS "investment_rules";
DROP TABLE IF EXISTS "investment_playbooks";
DROP TABLE IF EXISTS "chart_drawings";

DROP TYPE IF EXISTS "TriggerStatus";
DROP TYPE IF EXISTS "RuleType";
