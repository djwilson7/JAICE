import type { JobCardType } from "@/types/jobCardType";
import type { ReviewBehavior } from "@/pages/settings/provider/settingsTypes";
import type { ValidColumn } from "@/types/validColumns";

export function normalizeColumn(column?: string) {
  return (column ?? "").trim().toLowerCase();
}

export function getJobDisplayColumn(
  job: JobCardType,
  reviewBehavior: ReviewBehavior
) {
  if (job.reviewNeeded && reviewBehavior !== "inline") {
    return "review";
  }

  return normalizeColumn(job.column);
}

export function getJobsMovingToColumn(
  jobs: JobCardType[],
  targetColumn: ValidColumn,
  reviewBehavior: ReviewBehavior
) {
  return jobs.filter(
    (job) => getJobDisplayColumn(job, reviewBehavior) !== targetColumn
  );
}
