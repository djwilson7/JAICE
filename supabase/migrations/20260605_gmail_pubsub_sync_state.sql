-- Gmail Pub/Sub sync state and thread-aware ingestion metadata.

alter table public.user_account
    add column if not exists gmail_history_id text,
    add column if not exists gmail_watch_expiration timestamp with time zone,
    add column if not exists last_pubsub_message_id text,
    add column if not exists gmail_sync_status text,
    add column if not exists gmail_last_sync_at timestamp with time zone,
    add column if not exists gmail_last_sync_error text;

alter table internal_staging.email_staging
    add column if not exists provider_thread_id text,
    add column if not exists provider_history_id text;

alter table public.job_applications
    add column if not exists provider_thread_id text,
    add column if not exists provider_history_id text;

delete from internal_staging.email_staging older
using internal_staging.email_staging newer
where older.provider = newer.provider
    and older.provider_message_id = newer.provider_message_id
    and older.provider_message_id is not null
    and (
        older.created_at < newer.created_at
        or (older.created_at = newer.created_at and older.id < newer.id)
    );

create unique index if not exists email_staging_provider_message_unique
    on internal_staging.email_staging (provider, provider_message_id);

create index if not exists idx_email_staging_provider_thread
    on internal_staging.email_staging (provider, provider_thread_id);

create index if not exists job_applications_provider_thread_idx
    on public.job_applications (provider_source, provider_thread_id);
