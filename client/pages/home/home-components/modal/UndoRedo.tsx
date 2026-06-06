import { useUndoRedo } from "@/pages/home/hooks/useUndoRedo";
import undoIcon from "@/assets/icons/undo-alt.svg";
import redoIcon from "@/assets/icons/redo-alt.svg";
import type { JobCardType } from "@/types/jobCardType";
import { api } from "@/global-services/api";
import { useDrag } from "@/pages/home/hooks/useDrag";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";

export function UndoRedo() {
  const { isDragging } = useDrag();
  const { undoCount, redoCount, undo, redo } = useUndoRedo();
  const undoDisabled = isDragging || undoCount === 0;
  const redoDisabled = isDragging || redoCount === 0;

  const handleSnapshot = async (snapshot: JobCardType[]) => {
    console.log("Applying snapshot with", snapshot.length, "jobs");

    const mappedJobs = snapshot.map((j) => ({
      title: j.title ?? "Title",
      company_name: j.companyName ?? "Company",
      app_stage: j.column ?? j.applicationStage ?? "Applied",
      salary: j.salary ?? 0,
      received_at: j.receivedAtRaw ?? new Date().toISOString(),
      note: j.notes ?? "",
      is_deleted: j.isDeleted ?? false,
      is_archived: j.isArchived ?? false,
      needs_review: j.reviewNeeded ?? false,
      provider_message_id: j.id,
    }));

    const res = await api("/api/jobs/snapshot-update", {
      method: "POST",
      body: JSON.stringify({ jobs: mappedJobs }),
    });

    if (!(res && res.status === "success")) {
      console.error("Snapshot update failed", res);
    }
  };

  const applySnapshotLocally = (from: JobCardType[], to: JobCardType[]) => {
    const fromById = new Map(from.map((job) => [String(job.id), job]));

    for (const nextJob of to) {
      const previousJob = fromById.get(String(nextJob.id)) ?? nextJob;
      dispatchJobLocalChange({ before: previousJob, after: nextJob });
    }
  };

  const handleUndo = async () => {
    if (undoDisabled) return;

    console.log("Undo action triggered");
    const snapshot = undo();
    if (!snapshot) return;
    try {
      applySnapshotLocally(snapshot.after, snapshot.before);
      await handleSnapshot(snapshot.before);
    } catch (err) {
      applySnapshotLocally(snapshot.before, snapshot.after);
      console.error("Undo failed", err);
    }
  };

  const handleRedo = async () => {
    if (redoDisabled) return;

    console.log("Redo action triggered");
    const snapshot = redo();
    if (!snapshot) return;
    try {
      applySnapshotLocally(snapshot.before, snapshot.after);
      await handleSnapshot(snapshot.after);
    } catch (err) {
      applySnapshotLocally(snapshot.after, snapshot.before);
      console.error("Redo failed", err);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleUndo}
        aria-label="Undo last action"
        title={undoDisabled ? "No actions to undo" : "Undo last action"}
        disabled={undoDisabled}
        className="control-bar-container control-bar-container-compact undo-redo-control"
      >
        <img src={undoIcon} alt="" className="icon" />
      </button>

      <button
        type="button"
        onClick={handleRedo}
        aria-label="Redo last action"
        title={redoDisabled ? "No actions to redo" : "Redo last action"}
        disabled={redoDisabled}
        className="control-bar-container control-bar-container-compact undo-redo-control"
      >
        <img src={redoIcon} alt="" className="icon" />
      </button>
    </>
  );
}
