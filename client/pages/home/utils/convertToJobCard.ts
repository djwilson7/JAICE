import type { JobCardType } from "@/types/jobCardType";
import { convertTime } from "@/pages/home/utils/convertTime";

// These utility functions convert the raw job data from the database or broadcast events.
// The format for the returned data from the database comes in two forms. One is standard fetch, the other is from the realtime broadcast payload.

// Convert an array of job records from a normal DB fetch
export function convertToJobCardArray(rawJobs: any[] = []): JobCardType[] {
  return rawJobs.map(convertToJobCard);
}

// Convert a single job record from a normal DB fetch
export function convertToJobCard(rawJob: any): JobCardType {
  const rawDate = rawJob.received_at ?? null;

  return {
    id: String(rawJob.provider_message_id),
    title: rawJob.title || "No Title",
    column: rawJob.app_stage || "applied",
    date: convertTime(rawDate),
    receivedAtRaw: rawDate ? String(rawDate) : null,
    isArchived: rawJob.is_archived || false,
    isDeleted: rawJob.is_deleted || false,
  };
}

// Convert broadcast payloads from Supabase realtime
export function convertBroadcastToJobCard(event: any): JobCardType | null {
  const eventRecord = event?.payload?.record ?? event?.payload?.old ?? null;

  if (!eventRecord || !eventRecord.provider_message_id) return null;

  const rawDate = eventRecord.received_at ?? null;

  return {
    id: String(eventRecord.provider_message_id),
    title: eventRecord.title ?? "No Title",
    column: eventRecord.app_stage ?? "applied",
    date: convertTime(rawDate),
    receivedAtRaw: rawDate ? String(rawDate) : null,
    isArchived: eventRecord.is_archived || false,
    isDeleted: eventRecord.is_deleted || false,
  };
}
