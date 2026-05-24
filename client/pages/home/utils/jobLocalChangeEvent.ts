import type { JobCardType } from "@/types/jobCardType";

export const JOB_LOCAL_CHANGE_EVENT = "jaice:job-local-change";

export type JobLocalChangeDetail = {
  before: JobCardType;
  after: JobCardType;
};

export function dispatchJobLocalChange(detail: JobLocalChangeDetail) {
  window.dispatchEvent(
    new CustomEvent<JobLocalChangeDetail>(JOB_LOCAL_CHANGE_EVENT, { detail })
  );
}
