// Defines the structure of a job application row as stored in the database

export interface JobApplicationRow {
  id: number;
  user_uid: string;
  title: string | null;
  company_name: string | null;
  description: string | null;
  app_stage: string;
  provider_source: string | null;
  recruiter_name: string | null;
  recruiter_email: string | null;
  stage_confidence: number | null;
  is_archived: boolean;
  is_deleted: boolean;
  received_at: string;
  updated_at: string;
}

