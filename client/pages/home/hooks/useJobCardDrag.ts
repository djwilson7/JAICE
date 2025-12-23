import type { JobCardType } from "@/types/jobCardType";
import { useJobMutation } from "@/pages/home/hooks/useJobMutation";
import { useDrag } from "@/pages/home/hooks/useDrag";
import { ValidColumns } from "@/types/validColumns";

export function useJobCardDrag(
  job: JobCardType,
  confirmDelete?: () => Promise<boolean>
) {
  const { mutateJob } = useJobMutation();
  const { setIsDragging, setDraggedId, dragTarget, setDragStart } = useDrag();

  const onDragStart = () => {
    setIsDragging(true);
    setDraggedId(job.id);
    setDragStart(job.reviewNeeded ? "review" : job.column.toLowerCase());
  };

  const onDragEnd = async () => {
    setIsDragging(false);
    if (!dragTarget || !ValidColumns.includes(dragTarget)) return cleanup();

    if (dragTarget === "delete" && confirmDelete) {
      const proceed = await confirmDelete();
      if (!proceed) return cleanup(); // user cancelled
    }

    switch (dragTarget) {
      case "archive":
        mutateJob(job, { type: "archive" });
        break;
      case "delete":
        mutateJob(job, { type: "delete" });
        break;
      default:
        mutateJob(
          job,
          { type: "move", targetColumn: dragTarget },
          { label: "Drag & Drop" }
        );
    }

    cleanup();
  };

  const cleanup = () => {
    setDraggedId(null);
    setDragStart(null);
  };

  return { onDragStart, onDragEnd };
}
