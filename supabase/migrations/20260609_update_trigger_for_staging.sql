-- Change the default value of recently_added to false so new inserts don't get flagged by default
ALTER TABLE "public"."job_applications" ALTER COLUMN "recently_added" SET DEFAULT false;

-- Update the trigger to handle BOTH staging and processing columns properly
CREATE OR REPLACE FUNCTION trg_set_recently_added()
RETURNS trigger AS $$
BEGIN
  -- 1. Job card enters staging or processing -> no flag set via trigger
  IF LOWER(NEW.app_stage) IN ('processing', 'staging') THEN
    NEW.recently_added = false;
    
  -- 2. Job card moves from one column to another (e.g., drag and drop or pipeline)
  --    and lands in a main column -> recently added set via trigger
  ELSIF TG_OP = 'UPDATE' AND LOWER(OLD.app_stage) != LOWER(NEW.app_stage) AND LOWER(NEW.app_stage) NOT IN ('processing', 'staging') THEN
    NEW.recently_added = true;
    
  -- 3. Inserting directly into a main column -> recently added set via trigger
  ELSIF TG_OP = 'INSERT' AND LOWER(NEW.app_stage) NOT IN ('processing', 'staging') THEN
    NEW.recently_added = true;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure any jobs currently stuck in staging don't have the flag
UPDATE public.job_applications 
SET recently_added = false 
WHERE LOWER(app_stage) IN ('processing', 'staging');
