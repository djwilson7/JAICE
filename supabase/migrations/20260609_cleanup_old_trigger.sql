-- Drop the old mismatched triggers and functions that were fighting our logic
DROP TRIGGER IF EXISTS job_app_stage_change ON public.job_applications;
DROP FUNCTION IF EXISTS set_recently_added();

-- Ensure any existing 'Processing' cards have their flags cleared 
-- since the old trigger might have mistakenly flagged them.
UPDATE public.job_applications 
SET recently_added = false 
WHERE LOWER(app_stage) = 'processing';
