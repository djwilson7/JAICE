-- Align job application broadcasts with Supabase Realtime's managed helper.
-- The original source DB function inserted directly into realtime.messages,
-- which depends on managed daily partitions existing ahead of time.

create or replace function public.broadcast_job_applications_changes()
 returns trigger
 language plpgsql
 security definer
 set search_path = ''
as $function$
declare
  uid text;
begin
  uid := case
           when tg_op = 'DELETE' then old.user_uid::text
           else new.user_uid::text
         end;

  perform realtime.broadcast_changes(
    'user:' || uid || ':job_applications',
    tg_op,
    tg_op,
    tg_table_name,
    tg_table_schema,
    new,
    old
  );

  return null;
end;
$function$;

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
end $$;
