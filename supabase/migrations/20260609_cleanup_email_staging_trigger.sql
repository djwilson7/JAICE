CREATE OR REPLACE FUNCTION trg_cleanup_email_staging_batch()
RETURNS trigger AS $$
BEGIN
  DELETE FROM internal_staging.email_staging
  WHERE provider_message_id IN (
    SELECT provider_message_id FROM inserted_rows
    WHERE provider_message_id IS NOT NULL
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_apps_cleanup_staging_batch ON public.job_applications;

CREATE TRIGGER trg_job_apps_cleanup_staging_batch
AFTER INSERT ON public.job_applications
REFERENCING NEW TABLE AS inserted_rows
FOR EACH STATEMENT
EXECUTE FUNCTION trg_cleanup_email_staging_batch();

-- Also, let's do a one-time batch delete of any lingering staged emails
-- that are already fully transferred to the job_applications table.
DELETE FROM internal_staging.email_staging
WHERE provider_message_id IN (
  SELECT provider_message_id FROM public.job_applications
  WHERE provider_message_id IS NOT NULL
);
