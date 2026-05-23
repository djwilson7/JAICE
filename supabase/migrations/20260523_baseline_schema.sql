-- JAICE current Supabase schema baseline
-- Generated at: 2026-05-23T18:15:44.673669+00:00
-- Scope: schema-only; no table data is included.
-- Source schemas: public, internal_staging

create schema if not exists public;
create schema if not exists internal_staging;

-- Extensions observed on source. Review before applying to a new Supabase project.
-- extension: pg_cron schema=pg_catalog version=1.6.4
-- extension: pg_net schema=extensions version=0.19.5
-- extension: pg_stat_statements schema=extensions version=1.11
-- extension: pgcrypto schema=extensions version=1.3
-- extension: plpgsql schema=pg_catalog version=1.0
-- extension: supabase_vault schema=vault version=0.3.1
-- extension: uuid-ossp schema=extensions version=1.1

-- Sequences
create sequence if not exists "public"."app_events_event_id_seq" as bigint increment by 1 minvalue 1 maxvalue 9223372036854775807 start with 1;
create sequence if not exists "public"."job_applications_id_seq" as bigint increment by 1 minvalue 1 maxvalue 9223372036854775807 start with 1;

-- Tables
create table if not exists "internal_staging"."email_staging" (
    "id" text not null,
    "user_id_enc" text not null,
    "trace_id" text not null,
    "provider" text not null,
    "provider_message_id" text not null,
    "subject_enc" text,
    "sender_enc" text,
    "received_at" text,
    "body_enc" text,
    "created_at" timestamp with time zone default now() not null
);

create table if not exists "public"."app_events" (
    "event_id" bigint default nextval('app_events_event_id_seq'::regclass) not null,
    "job_fk" bigint not null,
    "user_uid" text not null,
    "event_type" text not null,
    "timestamp_utc" timestamp with time zone default timezone('utc'::text, now()) not null,
    "old_value" text,
    "new_value" text,
    "metadata" jsonb default '{}'::jsonb
);

create table if not exists "public"."job_applications" (
    "id" bigint default nextval('job_applications_id_seq'::regclass) not null,
    "user_uid" text not null,
    "title" text default 'Title'::text,
    "company_name" text default 'Company'::text,
    "description" text,
    "app_stage" text not null,
    "provider_source" text,
    "recruiter_name" text,
    "recruiter_email" text,
    "stage_confidence" double precision,
    "is_archived" boolean default false not null,
    "is_deleted" boolean default false not null,
    "received_at" text not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "app_stage_secondary" text,
    "stage_confidence_secondary" double precision,
    "needs_review" boolean default false,
    "provider_message_id" text,
    "relevance_model_confidence" double precision,
    "job_category" text,
    "note" text,
    "salary" numeric
);

create table if not exists "public"."user_account" (
    "user_id" text not null,
    "user_email" text,
    "gmail_connected" boolean default false not null,
    "google_refresh_token" bytea,
    "initial_gmail_sync" boolean default false not null,
    "gmail_connected_at" timestamp with time zone,
    "outlook_connected" boolean default false not null,
    "outlook_refresh_token" bytea,
    "initial_outlook_sync" boolean default false not null,
    "outlook_connected_at" timestamp with time zone,
    "backend_rls_jwt" text not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);

create table if not exists "public"."user_notification_settings" (
    "user_uid" text not null,
    "created_at" timestamp with time zone default now() not null,
    "updated_at" timestamp with time zone default now() not null,
    "app_updates_inapp" boolean default true not null,
    "app_updates_email" boolean default false not null,
    "app_updates_sms" boolean default false not null,
    "email_parsing_inapp" boolean default true not null,
    "email_parsing_email" boolean default true not null,
    "email_parsing_sms" boolean default false not null,
    "reminders_inapp" boolean default true not null,
    "reminders_email" boolean default true not null,
    "reminders_sms" boolean default false not null,
    "system_inapp" boolean default true not null,
    "system_email" boolean default true not null,
    "system_sms" boolean default false not null
);

-- Constraints
alter table only "internal_staging"."email_staging" add constraint "email_staging_pkey" PRIMARY KEY (id);
alter table only "public"."app_events" add constraint "app_events_pkey" PRIMARY KEY (event_id);
alter table only "public"."job_applications" add constraint "job_applications_provider_message_id_key" UNIQUE (provider_message_id);
alter table only "public"."job_applications" add constraint "job_applications_pkey" PRIMARY KEY (id);
alter table only "public"."user_account" add constraint "user_account_pkey" PRIMARY KEY (user_id);
alter table only "public"."user_notification_settings" add constraint "user_notification_settings_pkey" PRIMARY KEY (user_uid);
alter table only "public"."app_events" add constraint "app_events_job_fk_fkey" FOREIGN KEY (job_fk) REFERENCES job_applications(id) ON DELETE CASCADE;
alter table only "public"."job_applications" add constraint "fk_user_account_uid" FOREIGN KEY (user_uid) REFERENCES user_account(user_id) ON DELETE CASCADE;
alter table only "public"."user_notification_settings" add constraint "user_notification_settings_user_uid_fkey" FOREIGN KEY (user_uid) REFERENCES user_account(user_id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_email_staging_provider_msg ON internal_staging.email_staging USING btree (provider_message_id);
CREATE INDEX idx_email_staging_user ON internal_staging.email_staging USING btree (user_id_enc);
CREATE INDEX app_events_job_fk_idx ON public.app_events USING btree (job_fk);
CREATE INDEX app_events_user_uid_idx ON public.app_events USING btree (user_uid);
CREATE INDEX job_applications_user_uid_idx ON public.job_applications USING btree (user_uid);

-- Rules

-- Functions
CREATE OR REPLACE FUNCTION internal_staging.remove_purged_emails()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'internal_staging', 'pg_catalog'
AS $function$
BEGIN
  DELETE FROM internal_staging.email_staging
  WHERE status = 'PURGE';
END;
$function$;

CREATE OR REPLACE FUNCTION public.broadcast_changes(topic text, schema_name text, table_name text, operation text, old_record jsonb, new_record jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO realtime.messages (topic, event, payload, extension)
  VALUES (
    topic,
    operation,
    jsonb_build_object(
      'schema', schema_name,
      'table', table_name,
      'type', operation,
      'old', old_record,
      'record', new_record
    ),
    'postgres_changes'  -- 👈 required for Realtime v2
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.broadcast_job_applications_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  uid text;
BEGIN
  uid := CASE
           WHEN TG_OP = 'DELETE' THEN OLD.user_uid::text
           ELSE NEW.user_uid::text
         END;

  PERFORM realtime.broadcast_changes(
    'user:' || uid || ':job_applications',
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );

  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_expired_soft_deletes()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  DELETE FROM public.job_applications
  WHERE is_deleted = TRUE AND updated_at < NOW() - INTERVAL '14 days';
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_new_job_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    INSERT INTO public.app_events(
        job_fk,
        user_uid,
        event_type,
        old_value,
        new_value
    )
    VALUES(
        NEW.id,
        NEW.user_uid,
        'processed',
        NULL,
        NEW.app_stage
    );
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_stage_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    IF NEW.app_stage IS DISTINCT FROM OLD.app_stage THEN
        INSERT INTO public.app_events(
            job_fk,
            user_uid,
            event_type,
            old_value,
            new_value
        )
        VALUES(
            NEW.id,
            NEW.user_uid,
            'stage_change',
            OLD.app_stage,
            NEW.app_stage
        );
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_uns_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Triggers
CREATE TRIGGER job_applications_realtime_trigger AFTER INSERT OR DELETE OR UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION broadcast_job_applications_changes();
CREATE TRIGGER on_job_applications_update BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_log_new_job_application AFTER INSERT ON job_applications FOR EACH ROW EXECUTE FUNCTION log_new_job_application();
CREATE TRIGGER trigger_log_stage_change AFTER UPDATE ON job_applications FOR EACH ROW WHEN (old.app_stage IS DISTINCT FROM new.app_stage) EXECUTE FUNCTION log_stage_change();
CREATE TRIGGER set_uns_updated_at BEFORE UPDATE ON user_notification_settings FOR EACH ROW EXECUTE FUNCTION set_uns_updated_at();

-- Row-level security
alter table "public"."app_events" enable row level security;
alter table "public"."job_applications" enable row level security;
alter table "public"."user_account" enable row level security;
alter table "public"."user_notification_settings" enable row level security;
create policy "Users can create their own job events."
on "public"."app_events"
as permissive
for insert
to public
with check (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "Users can delete their own job events."
on "public"."app_events"
as permissive
for delete
to public
using (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "Users can update their own job events."
on "public"."app_events"
as permissive
for update
to public
using (((( SELECT auth.uid() AS uid))::text = user_uid))
with check (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "Users can view their own job events."
on "public"."app_events"
as permissive
for select
to public
using (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "Users can create their own job applications."
on "public"."job_applications"
as permissive
for insert
to public
with check (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "Users can delete their own job applications."
on "public"."job_applications"
as permissive
for delete
to public
using (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "Users can update their own job applications."
on "public"."job_applications"
as permissive
for update
to public
using (((( SELECT auth.uid() AS uid))::text = user_uid))
with check (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "Users can view their own job applications."
on "public"."job_applications"
as permissive
for select
to public
using (((( SELECT auth.uid() AS uid))::text = user_uid));
create policy "user_parser_access"
on "public"."user_account"
as permissive
for all
to authenticated
using (((( SELECT auth.uid() AS uid))::text = user_id))
with check (((( SELECT auth.uid() AS uid))::text = user_id));
create policy "uns_insert_self"
on "public"."user_notification_settings"
as permissive
for insert
to authenticated
with check ((user_uid = (auth.uid())::text));
create policy "uns_read_self"
on "public"."user_notification_settings"
as permissive
for select
to authenticated
using ((user_uid = (auth.uid())::text));
create policy "uns_update_self"
on "public"."user_notification_settings"
as permissive
for update
to authenticated
using ((user_uid = (auth.uid())::text))
with check ((user_uid = (auth.uid())::text));

-- Grants observed for standard Supabase roles
grant CREATE, USAGE on schema "internal_staging" to "postgres";
grant USAGE on schema "public" to "anon";
grant USAGE on schema "public" to "authenticated";
grant USAGE on schema "public" to "postgres";
grant USAGE on schema "public" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "internal_staging"."email_staging" to "postgres";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."app_events" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."app_events" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."app_events" to "postgres";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."app_events" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."job_applications" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."job_applications" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."job_applications" to "postgres";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."job_applications" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_account" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_account" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_account" to "postgres";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_account" to "service_role";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_notification_settings" to "anon";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_notification_settings" to "authenticated";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_notification_settings" to "postgres";
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table "public"."user_notification_settings" to "service_role";
-- routine grant observed: EXECUTE on "internal_staging"."remove_purged_emails" to "postgres"
-- routine grant observed: EXECUTE on "public"."broadcast_changes" to "anon"
-- routine grant observed: EXECUTE on "public"."broadcast_changes" to "authenticated"
-- routine grant observed: EXECUTE on "public"."broadcast_changes" to "postgres"
-- routine grant observed: EXECUTE on "public"."broadcast_changes" to "service_role"
-- routine grant observed: EXECUTE on "public"."broadcast_job_applications_changes" to "anon"
-- routine grant observed: EXECUTE on "public"."broadcast_job_applications_changes" to "authenticated"
-- routine grant observed: EXECUTE on "public"."broadcast_job_applications_changes" to "postgres"
-- routine grant observed: EXECUTE on "public"."broadcast_job_applications_changes" to "service_role"
-- routine grant observed: EXECUTE on "public"."handle_expired_soft_deletes" to "anon"
-- routine grant observed: EXECUTE on "public"."handle_expired_soft_deletes" to "authenticated"
-- routine grant observed: EXECUTE on "public"."handle_expired_soft_deletes" to "postgres"
-- routine grant observed: EXECUTE on "public"."handle_expired_soft_deletes" to "service_role"
-- routine grant observed: EXECUTE on "public"."log_new_job_application" to "anon"
-- routine grant observed: EXECUTE on "public"."log_new_job_application" to "authenticated"
-- routine grant observed: EXECUTE on "public"."log_new_job_application" to "postgres"
-- routine grant observed: EXECUTE on "public"."log_new_job_application" to "service_role"
-- routine grant observed: EXECUTE on "public"."log_stage_change" to "anon"
-- routine grant observed: EXECUTE on "public"."log_stage_change" to "authenticated"
-- routine grant observed: EXECUTE on "public"."log_stage_change" to "postgres"
-- routine grant observed: EXECUTE on "public"."log_stage_change" to "service_role"
-- routine grant observed: EXECUTE on "public"."set_uns_updated_at" to "anon"
-- routine grant observed: EXECUTE on "public"."set_uns_updated_at" to "authenticated"
-- routine grant observed: EXECUTE on "public"."set_uns_updated_at" to "postgres"
-- routine grant observed: EXECUTE on "public"."set_uns_updated_at" to "service_role"
-- routine grant observed: EXECUTE on "public"."update_updated_at_column" to "anon"
-- routine grant observed: EXECUTE on "public"."update_updated_at_column" to "authenticated"
-- routine grant observed: EXECUTE on "public"."update_updated_at_column" to "postgres"
-- routine grant observed: EXECUTE on "public"."update_updated_at_column" to "service_role"

grant execute on all functions in schema "public" to "anon";
grant execute on all functions in schema "public" to "authenticated";
grant execute on all functions in schema "public" to "postgres";
grant execute on all functions in schema "public" to "service_role";
grant execute on all functions in schema "internal_staging" to "postgres";

-- Realtime/publication audit
-- publication supabase_realtime includes "public"."app_events"
-- publication supabase_realtime includes "public"."job_applications"

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'realtime'
      and tablename = 'messages'
      and policyname = 'Authenticated users can receive broadcasts'
  ) then
    create policy "Authenticated users can receive broadcasts"
    on realtime.messages
    for select
    to authenticated
    using (true);
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'app_events'
    ) then
      alter publication supabase_realtime add table public.app_events;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'job_applications'
    ) then
      alter publication supabase_realtime add table public.job_applications;
    end if;
  end if;
end $$;
