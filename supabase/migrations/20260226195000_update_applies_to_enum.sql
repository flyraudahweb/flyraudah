-- Drop the old constraint based on its name dynamically or just add a new name if it's simpler.
DO $$ 
DECLARE 
  found_constraint text;
BEGIN
  SELECT con.conname INTO found_constraint
  FROM pg_constraint con
  INNER JOIN pg_class rel ON rel.oid = con.conrelid
  INNER JOIN pg_namespace nsp ON nsp.oid = connamespace
  INNER JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
  WHERE nsp.nspname = 'public' 
    AND rel.relname = 'booking_form_fields' 
    AND a.attname = 'applies_to' 
    AND con.contype = 'c';

  IF found_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.booking_form_fields DROP CONSTRAINT ' || found_constraint;
  END IF;
  
  ALTER TABLE public.booking_form_fields 
  ADD CONSTRAINT booking_form_fields_applies_to_check 
  CHECK (applies_to = ANY (ARRAY['user', 'agent', 'both', 'admin', 'all']));
END $$;
