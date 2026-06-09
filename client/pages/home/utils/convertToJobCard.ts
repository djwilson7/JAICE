import type { JobCardType } from "@/types/jobCardType";
import type { JobApplicationRow } from "@/types/jobApplicationRow";
import { convertTime } from "@/pages/home/utils/convertTime";
// These utility functions convert the raw job data from the database or broadcast events.
// The format for the returned data from the database comes in two forms. One is standard fetch, the other is from the realtime broadcast payload.
export type RawJobApplication = Partial<JobApplicationRow> & {
  provider_message_id?: string | number;
  salary?: number | null;
  note?: string | null;
  needs_review?: boolean | null;
  review_needed?: boolean | null;
  needsReview?: boolean | null;
  application_stage?: string | null;
  applicationStage?: string | null;
  recently_added?: boolean | null;
  recentlyAdded?: boolean | null;
  updated_at?: string | null;
};

export type JobRealtimeEvent = {
  event?: string;
  type?: string;
  payload?: {
    event?: string;
    type?: string;
    operation?: string;
    record?: RawJobApplication | null;
    new?: RawJobApplication | null;
    new_record?: RawJobApplication | null;
    old?: RawJobApplication | null;
    old_record?: RawJobApplication | null;
  };
};

// Convert an array of job records from a normal DB fetch
export function convertToJobCardArray(rawJobs: RawJobApplication[] = []): JobCardType[] {
  return rawJobs.map(convertToJobCard);
}

// Convert a single job record from a normal DB fetch
export function convertToJobCard(rawJob: RawJobApplication): JobCardType {
  const rawDate = rawJob.received_at ?? null;

  return {
    id: String(rawJob.provider_message_id),
    title: rawJob.title || "No Title",
    description: rawJob.description ?? undefined,
    column: rawJob.app_stage || "applied",
    companyName: rawJob.company_name ??  undefined,
    salary: rawJob.salary ?? undefined,
    date: convertTime(rawDate),
    receivedAtRaw: rawDate ? String(rawDate) : null,
    updatedAtRaw: rawJob.updated_at ? String(rawJob.updated_at) : null,
    isArchived: rawJob.is_archived || false,
    isDeleted: rawJob.is_deleted || false,
    notes: rawJob.note ?? undefined,
    providerSource: rawJob.provider_source ?? undefined,
    reviewNeeded: !!(rawJob.needs_review ?? rawJob.review_needed ?? rawJob.needsReview ?? false),
    recentlyAdded: !!(rawJob.recently_added ?? rawJob.recentlyAdded ?? false) && !["processing", "staging"].includes(rawJob.app_stage?.toLowerCase() ?? ""),
    applicationStage: rawJob.application_stage ?? rawJob.app_stage ?? rawJob.applicationStage ?? undefined,
  };
}

// Convert broadcast payloads from Supabase realtime
export function convertBroadcastToJobCard(event: JobRealtimeEvent): JobCardType | null {
  const eventRecord =
    event?.payload?.record ??
    event?.payload?.new ??
    event?.payload?.new_record ??
    event?.payload?.old ??
    event?.payload?.old_record ??
    null;

  if (!eventRecord || !eventRecord.provider_message_id) return null;

  const rawDate = eventRecord.received_at ?? null;

  return {
    id: String(eventRecord.provider_message_id),
    title: eventRecord.title || "No Title",
    description: eventRecord.description ?? undefined,
    column: eventRecord.app_stage ?? "applied",
    companyName: eventRecord.company_name ??  undefined,
    salary: eventRecord.salary ?? undefined,
    date: convertTime(rawDate),
    receivedAtRaw: rawDate ? String(rawDate) : null,
    updatedAtRaw: eventRecord.updated_at ? String(eventRecord.updated_at) : null,
    isArchived: eventRecord.is_archived || false,
    isDeleted: eventRecord.is_deleted || false,
    notes: eventRecord.note ?? undefined,
    providerSource: eventRecord.provider_source ?? undefined,
    reviewNeeded: !!(eventRecord.needs_review ?? eventRecord.review_needed ?? eventRecord.needsReview ?? false),
    recentlyAdded: !!(eventRecord.recently_added ?? eventRecord.recentlyAdded ?? false) && !["processing", "staging"].includes(eventRecord.app_stage?.toLowerCase() ?? ""),
    applicationStage: eventRecord.application_stage ?? eventRecord.app_stage ?? eventRecord.applicationStage ?? undefined,
  };
}
