import { api } from "@/global-services/api";
import { useIsMultiSelecting } from "./useIsMultiSelecting";
import { useUndoRedo } from "./useUndoRedo";
import type { JobCardType } from "@/types/jobCardType";

export function useDeleteByJobId() {
  const { setIsMultiSelecting } = useIsMultiSelecting();
  const { pushUndo } = useUndoRedo();

  const deleteJob = async (job: JobCardType): Promise<boolean> => {
    try {
      const jobBefore = { ...job };
      const res = await api("/api/jobs/set-delete", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: [job.id],
        }),
      });
      const jobAfter = { ...job, isDeleted: true };
      if (!(res && res.status === "success" && res.count > 0)) {
        console.error("Delete API responded but did not delete any rows:", res);
        return false;
      }

      setIsMultiSelecting(false);

      if (job) {
        pushUndo({
          before: [jobBefore],
          after: [jobAfter],
          label: "Delete",
        });
      }

      return true;
    } catch (error) {
      console.error("Failed to delete job with id:", job.id, error);
      return false;
    }
  };
  return { deleteJob };
}
