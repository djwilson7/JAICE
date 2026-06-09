ALTER TABLE "public"."job_applications" ADD COLUMN IF NOT EXISTS "recently_added" boolean default true not null;

-- Set existing records to false so only new ones show up as recently added
UPDATE "public"."job_applications" SET "recently_added" = false;
