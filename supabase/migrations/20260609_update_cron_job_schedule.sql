SELECT cron.unschedule('delete-trashed-jobs');

SELECT cron.schedule(
    'delete-trashed-jobs',
    '0 3 * * *',
    $$ DELETE FROM public.job_applications WHERE is_deleted = true AND updated_at < now() - interval '30 days'; $$
);
