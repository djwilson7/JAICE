CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup job
-- FOR TESTING: Runs every minute, deletes jobs deleted > 5 minutes ago.
SELECT cron.schedule(
    'delete-trashed-jobs',
    '* * * * *',
    $$ DELETE FROM public.job_applications WHERE is_deleted = true AND updated_at < now() - interval '5 minutes'; $$
);
