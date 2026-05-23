# Current Supabase Schema Discovery

- Generated at: `2026-05-23T18:15:44.673669+00:00`
- Source: current `CLIENT_DATABASE_URL` from `.env`
- Scope: schema only; no table data copied
- Schemas: `public`, `internal_staging`

## Critical Surface Check
- `public.job_applications`: present
- `public.user_account`: present
- `internal_staging.email_staging`: present

## Tables
- `internal_staging.email_staging`: 10 columns, RLS=off
- `public.app_events`: 8 columns, RLS=on
- `public.job_applications`: 22 columns, RLS=on
- `public.user_account`: 13 columns, RLS=on
- `public.user_notification_settings`: 15 columns, RLS=on

## Functions
- `internal_staging.remove_purged_emails()`
- `public.broadcast_changes(topic text, schema_name text, table_name text, operation text, old_record jsonb, new_record jsonb)`
- `public.broadcast_job_applications_changes()`
- `public.handle_expired_soft_deletes()`
- `public.log_new_job_application()`
- `public.log_stage_change()`
- `public.set_uns_updated_at()`
- `public.update_updated_at_column()`

## Triggers
- `public.job_applications` -> `job_applications_realtime_trigger`
- `public.job_applications` -> `on_job_applications_update`
- `public.job_applications` -> `trigger_log_new_job_application`
- `public.job_applications` -> `trigger_log_stage_change`
- `public.user_notification_settings` -> `set_uns_updated_at`

## RLS Policies
- `public.app_events` -> `Users can create their own job events.` (INSERT)
- `public.app_events` -> `Users can delete their own job events.` (DELETE)
- `public.app_events` -> `Users can update their own job events.` (UPDATE)
- `public.app_events` -> `Users can view their own job events.` (SELECT)
- `public.job_applications` -> `Users can create their own job applications.` (INSERT)
- `public.job_applications` -> `Users can delete their own job applications.` (DELETE)
- `public.job_applications` -> `Users can update their own job applications.` (UPDATE)
- `public.job_applications` -> `Users can view their own job applications.` (SELECT)
- `public.user_account` -> `user_parser_access` (ALL)
- `public.user_notification_settings` -> `uns_insert_self` (INSERT)
- `public.user_notification_settings` -> `uns_read_self` (SELECT)
- `public.user_notification_settings` -> `uns_update_self` (UPDATE)

## Realtime/Publications
- `supabase_realtime` includes `public.app_events`
- `supabase_realtime` includes `public.job_applications`

## Review Notes
- Review the generated SQL before using it against a new Supabase project.
- Supabase-managed schemas such as `auth`, `storage`, and extension schemas are intentionally not cloned.
- Realtime internals are audited but not wholesale cloned.

## Migration Review Warnings
- `internal_staging.remove_purged_emails` references `internal_staing`; verify whether this source typo must be corrected before rebuild.
