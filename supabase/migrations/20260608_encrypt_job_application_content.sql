-- This reset is intentionally destructive. Existing job application data is
-- discarded because plaintext values cannot be converted without the app key.
truncate table
    public.job_applications,
    internal_staging.email_staging
restart identity cascade;

alter table public.job_applications
    add column if not exists title_enc bytea,
    add column if not exists company_name_enc bytea,
    add column if not exists description_enc bytea,
    add column if not exists recruiter_name_enc bytea,
    add column if not exists recruiter_email_enc bytea,
    add column if not exists note_enc bytea;

alter table public.job_applications
    drop column if exists title,
    drop column if exists company_name,
    drop column if exists description,
    drop column if exists recruiter_name,
    drop column if exists recruiter_email,
    drop column if exists note;

revoke all privileges on table public.job_applications from anon;
revoke all privileges on table public.job_applications from authenticated;
