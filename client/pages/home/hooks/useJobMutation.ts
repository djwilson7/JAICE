import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import type { JobCardType } from "@/types/jobCardType";
import type { JobIntent } from "@/types/jobIntent";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import { applyJobIntentToJob } from "@/pages/home/hooks/applyIntentToJob";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";

export function useJobMutation() {
  const { pushUndo } = useUndoRedo();

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
      throw error;
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
