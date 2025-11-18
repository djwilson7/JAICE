import { createClient } from "@supabase/supabase-js";
import type { JobCardType } from "@/types/jobCardType";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function fetchJobById(jobId: string): Promise<JobCardType | null> {
    const { data, error } = await supabase
        .from("job_applications")
        .select(`provider_message_id, title, app_stage, application_stage, received_at, is_archived, is_deleted, needs_review`)
        .eq("provider_message_id", jobId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching job by ID:", error);
        return null;
    }
    if (!data) return null;

    // Map returned DB row to JobCardType
    const raw = data as any;
    const rawDate = raw.received_at ?? null;

    return {
        id: String(raw.provider_message_id),
        title: raw.title ?? "No Title",
        column: raw.app_stage ?? raw.application_stage ?? "applied",
        date: rawDate ? new Date(rawDate).toISOString() : undefined,
        receivedAtRaw: rawDate ? String(rawDate) : null,
        isArchived: raw.is_archived || false,
        isDeleted: raw.is_deleted || false,
        reviewNeeded: raw.needs_review ?? raw.reviewNeeded ?? false,
        applicationStage: raw.application_stage ?? raw.app_stage ?? raw.applicationStage ?? undefined,
    } as JobCardType;
}