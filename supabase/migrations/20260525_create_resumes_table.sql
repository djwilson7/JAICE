-- Create resumes table
create table if not exists "public"."resumes" (
    "id" uuid default gen_random_uuid() not null,
    "user_uid" text not null,
    "name" text not null default 'My Resume',
    "is_master" boolean default false not null,
    "schema_version" integer not null default 1,
    "source_resume_id" uuid null,
    "resume_data" jsonb not null,
    "target_job_title" text,
    "target_job_description" text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()) not null,
    
    constraint "resumes_pkey" primary key ("id"),
    constraint "resumes_user_uid_fkey" foreign key ("user_uid") references "public"."user_account" ("user_id") on delete cascade,
    constraint "resumes_source_resume_id_fkey" foreign key ("source_resume_id") references "public"."resumes" ("id") on delete set null
);

-- Partial unique index to enforce exactly ONE master resume per user
create unique index if not exists "one_master_resume_per_user" 
on "public"."resumes"("user_uid") 
where (is_master = true);

-- Performance indices
create index if not exists resumes_user_uid_idx on public.resumes using btree (user_uid);

-- Enable Row-Level Security
alter table "public"."resumes" enable row level security;

-- RLS Policies
create policy "Users can view their own resumes"
on "public"."resumes" for select to authenticated
using ((user_uid = (auth.uid())::text));

create policy "Users can insert their own resumes"
on "public"."resumes" for insert to authenticated
with check ((user_uid = (auth.uid())::text));

create policy "Users can update their own resumes"
on "public"."resumes" for update to authenticated
using ((user_uid = (auth.uid())::text))
with check ((user_uid = (auth.uid())::text));

create policy "Users can delete their own resumes"
on "public"."resumes" for delete to authenticated
using ((user_uid = (auth.uid())::text));

-- Trigger to automatically update the updated_at column
create or replace trigger update_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
