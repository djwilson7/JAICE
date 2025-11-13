import type { JobApplicationRow } from "@/types/jobApplicationRow";

// Defines the structure of a job application broadcast payload from Supabase Realtime
export type JobBroadcastPayload = {
  event: string; 
  payload: {
    schema: string;
    table: string;
    type: string;
    old: Partial<JobApplicationRow> | null;
    record: JobApplicationRow | null;
  };
};
