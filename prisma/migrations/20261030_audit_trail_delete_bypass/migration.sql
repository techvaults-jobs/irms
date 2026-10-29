-- Audit trail immutability, with an explicit transaction-scoped bypass for
-- admin hard deletes (permanently deleting a user or requisition).
--
-- Idempotent: some databases were baselined without the original triggers
-- from 1_add_audit_trail_immutability, so (re)create them here.
--
-- To delete audit rows inside a transaction:
--   SELECT set_config('irms.allow_audit_delete', 'on', true);
-- The setting is local to that transaction. Updates are never allowed.

CREATE OR REPLACE FUNCTION prevent_audit_trail_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit trail entries are immutable and cannot be modified';
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF current_setting('irms.allow_audit_delete', true) = 'on' THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Audit trail entries are immutable and cannot be deleted directly';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_trail_prevent_update ON "AuditTrail";
DROP TRIGGER IF EXISTS audit_trail_prevent_delete ON "AuditTrail";

CREATE TRIGGER audit_trail_prevent_update
BEFORE UPDATE ON "AuditTrail"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_trail_modification();

CREATE TRIGGER audit_trail_prevent_delete
BEFORE DELETE ON "AuditTrail"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_trail_modification();
