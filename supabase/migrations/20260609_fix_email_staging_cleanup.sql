-- Drop the bad trigger that deleted on INSERT
DROP TRIGGER IF EXISTS trg_job_apps_cleanup_staging_batch ON public.job_applications;
DROP FUNCTION IF EXISTS trg_cleanup_email_staging_batch();

-- Create the UPDATE trigger function
CREATE OR REPLACE FUNCTION trg_cleanup_email_staging_update_batch()
RETURNS trigger AS $$
BEGIN
  DELETE FROM internal_staging.email_staging
  WHERE provider_message_id IN (
    SELECT provider_message_id FROM updated_rows
    WHERE LOWER(app_stage) NOT IN ('processing', 'staging')
      AND provider_message_id IS NOT NULL
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the DELETE trigger function
CREATE OR REPLACE FUNCTION trg_cleanup_email_staging_delete_batch()
RETURNS trigger AS $$
BEGIN
  DELETE FROM internal_staging.email_staging
  WHERE provider_message_id IN (
    SELECT provider_message_id FROM deleted_rows
    WHERE provider_message_id IS NOT NULL
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach the UPDATE trigger
CREATE TRIGGER trg_job_apps_cleanup_staging_update
AFTER UPDATE ON public.job_applications
REFERENCING NEW TABLE AS updated_rows
FOR EACH STATEMENT
EXECUTE FUNCTION trg_cleanup_email_staging_update_batch();

-- Attach the DELETE trigger
CREATE TRIGGER trg_job_apps_cleanup_staging_delete
AFTER DELETE ON public.job_applications
REFERENCING OLD TABLE AS deleted_rows
FOR EACH STATEMENT
EXECUTE FUNCTION trg_cleanup_email_staging_delete_batch();
