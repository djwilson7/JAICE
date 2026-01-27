import type { JobCardType } from "@/types/jobCardType";
import type { JobIntent } from "@/types/jobIntent";

export function applyJobIntentToJob(
  job: JobCardType,
  intent: JobIntent
): JobCardType {
  const updated = { ...job };

  switch (intent.type) {
    case "archive":
      updated.isArchived = true;
      updated.reviewNeeded = false;
      break;

    case "delete":
      updated.isDeleted = true;
      updated.reviewNeeded = false;
      break;

    case "review":
      updated.reviewNeeded = false;
      break;

    case "move":
      updated.column = intent.targetColumn;
      updated.reviewNeeded = false; // if that’s your rule
      break;
  }

  return updated;
}
