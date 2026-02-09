-- Add immutability constraint to AuditTrail table
-- Prevent any updates or direct deletes on audit trail entries
-- Cascade deletes from requisition deletion are allowed at the database level

CREATE OR REPLACE FUNCTION prevent_audit_trail_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent updates
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Audit trail entries are immutable and cannot be modified';
  END IF;
  
  -- Prevent direct deletes
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Audit trail entries are immutable and cannot be deleted directly';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_trail_prevent_update
BEFORE UPDATE ON "AuditTrail"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_trail_modification();

CREATE TRIGGER audit_trail_prevent_delete
BEFORE DELETE ON "AuditTrail"
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_trail_modification();
