CREATE OR REPLACE FUNCTION trg_set_recently_added()
RETURNS trigger AS $$
BEGIN
  -- 1. Job card enters processing -> no flag set via trigger
  IF LOWER(NEW.app_stage) = 'processing' THEN
    NEW.recently_added = false;
    
  -- 2. Job card moves to another column (e.g., drag and drop) -> recently added set via trigger
  ELSIF TG_OP = 'UPDATE' AND LOWER(OLD.app_stage) != LOWER(NEW.app_stage) THEN
    NEW.recently_added = true;
    
  -- 3. Inserting directly into a non-processing column -> recently added set via trigger
  ELSIF TG_OP = 'INSERT' THEN
    NEW.recently_added = true;
    
  END IF;
  
  -- Note: If the user opens the card, the frontend explicitly sends an UPDATE 
  -- with recently_added = false without changing app_stage. 
  -- In that case, none of the above IFs trigger, and the explicit false is saved.
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_applications_stage_change ON public.job_applications;

CREATE TRIGGER trg_job_applications_stage_change
BEFORE INSERT OR UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION trg_set_recently_added();
