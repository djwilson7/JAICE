import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import type { JobCardType } from "@/types/jobCardType";
import type { JobIntent } from "@/types/jobIntent";
import { writeJobsToDB } from "@/global-services/writeJobsToDB";
import { applyJobIntentToJob } from "@/pages/home/hooks/applyIntentToJob";

export function useJobMutation() {
  const { pushUndo } = useUndoRedo();

  const mutateJob = async (
    job: JobCardType,
    intent: JobIntent,
    options?: { pushUndo?: boolean; label?: string }
  ) => {
    const before = job;
    const after = applyJobIntentToJob(job, intent);

    await writeJobsToDB({ jobs_to_update: [after] });

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
