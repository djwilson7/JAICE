import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import type { JobCardType } from "@/types/jobCardType";
import type { JobIntent } from "@/types/jobIntent";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import { applyJobIntentToJob } from "@/pages/home/hooks/applyIntentToJob";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";
import { useBannerNotifications } from "@/global-components/bannerNotificationContext";

export function useJobMutation() {
  const { pushUndo } = useUndoRedo();
  const { showBanner } = useBannerNotifications();

  const mutateJob = async (
    job: JobCardType,
    intent: JobIntent,
    options?: { pushUndo?: boolean; label?: string }
  ) => {
    const before = job;

    if (
      intent.type === "move" &&
      normalizeColumn(job.column) === normalizeColumn(intent.targetColumn)
    ) {
      return;
    }

    const after = applyJobIntentToJob(job, intent);

    if (!hasMeaningfulJobChange(before, after)) return;

    dispatchJobLocalChange({ before, after });

    try {
      await writeJobsToDB({ jobs_to_update: [after] });
    } catch (error) {
      dispatchJobLocalChange({ before: after, after: before });
      showBanner({
        message: getJobMutationFailureMessage(intent),
        tone: "error",
        timeoutMs: 10000,
      });
      throw error;
    }

    const successMessage = getJobMutationSuccessMessage(intent, after);
    if (successMessage) {
      showBanner({
        message: successMessage,
        tone: "success",
        timeoutMs: 4000,
      });
    }

    if (options?.pushUndo !== false) {
      pushUndo({
        label: options?.label ?? "Update Job",
        before: [before],
        after: [after],
      });
    }
  };

  return { mutateJob };
}

function normalizeColumn(column?: string) {
  return (column ?? "").trim().toLowerCase();
}

function formatColumnName(column: string) {
  return column
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getJobMutationSuccessMessage(intent: JobIntent, job: JobCardType) {
  switch (intent.type) {
    case "move":
      return `${job.title} moved to ${formatColumnName(intent.targetColumn)}.`;
    case "archive":
      return `${job.title} archived successfully.`;
    case "delete":
      return `${job.title} deleted successfully.`;
    default:
      return null;
  }
}

function getJobMutationFailureMessage(intent: JobIntent) {
  switch (intent.type) {
    case "move":
      return "Failed to move job. Try again.";
    case "archive":
      return "Failed to archive job. Try again.";
    case "delete":
      return "Failed to delete job. Try again.";
    default:
      return "Failed to update job. Try again.";
  }
}

function hasMeaningfulJobChange(before: JobCardType, after: JobCardType) {
  return (
    before.title !== after.title ||
    before.description !== after.description ||
    before.column !== after.column ||
    before.companyName !== after.companyName ||
    before.date !== after.date ||
    before.salary !== after.salary ||
    before.receivedAtRaw !== after.receivedAtRaw ||
    before.isArchived !== after.isArchived ||
    before.isDeleted !== after.isDeleted ||
    before.notes !== after.notes ||
    before.providerSource !== after.providerSource ||
    before.reviewNeeded !== after.reviewNeeded ||
    before.applicationStage !== after.applicationStage
  );
}
