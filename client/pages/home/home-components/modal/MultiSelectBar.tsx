import trashIcon from "@/assets/icons/trash.svg";
import trashAddIcon from "@/assets/icons/trash-add.svg";
import trashCheckIcon from "@/assets/icons/trash-check.svg";
import trashXIcon from "@/assets/icons/trash-x.svg";
import folderIcon from "@/assets/icons/folder.svg";
import folderXIcon from "@/assets/icons/folder-x.svg";
import folderCheckIcon from "@/assets/icons/folder-check.svg";
import folderAddIcon from "@/assets/icons/folder-add.svg";
import reviewIcon from "@/assets/icons/review.svg";
import reviewIconHover from "@/assets/icons/review_hover.svg";
import { HoverIconButton } from "@/global-components/button";
import { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import { useIsMultiSelecting } from "../../hooks/useIsMultiSelecting";
import { useSelectedJobs } from "../../hooks/useSelectedJobs";
import { useUndoRedo } from "../../hooks/useUndoRedo";
import { useDrag } from "@/pages/home/hooks/useDrag";

import ConfirmModal from "@/global-components/ConfirmModal";

type HoverAction =
  | "archive"
  | "delete"
  | "review"
  | null;

export function MultiSelectBar({
  className,
  setIsHighlighted,
}: {
  className?: string;
  setIsHighlighted: (stage: string | null) => void;
}) {
  const { isMultiSelecting, setIsMultiSelecting } = useIsMultiSelecting();
  const { selectedJobs, setSelectedJobs } = useSelectedJobs();
  const { pushUndo } = useUndoRedo();
  const { isDragging } = useDrag();

  const [hoverAction, setHoverAction] = useState<HoverAction>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const selectedCount = selectedJobs.length ?? 0;

  const [isEnabled, setIsEnabled] = useState(selectedCount > 0);

  useEffect(() => {
    setIsEnabled(selectedCount > 0);
  }, [selectedCount]);

  if (!isMultiSelecting || isDragging) return null;

  const getStatusText = () => {
    if (selectedCount === 0) return "Select jobs to see actions.";
    const plural = selectedCount > 1 ? "jobs" : "job";

    switch (hoverAction) {
      case "archive":
        setIsHighlighted(null);
        return `Archive ${selectedCount} ${plural}?`;
      case "delete":
        setIsHighlighted(null);
        return `Delete ${selectedCount} ${plural}?`;
      case "review":
        setIsHighlighted(null);
        return `Mark ${selectedCount} ${plural} as reviewed?`;
      default:
        setIsHighlighted(null);
        return `${selectedCount} ${plural} selected.`;
    }
  };

  const onArchiveClicked = async () => {
    try {
      const jobIds = selectedJobs.map((j) => j.id);
      const beforeJobState = [...selectedJobs]; // Capture state before archive
      const afterActionJobState = selectedJobs.map((job) => ({
        ...job,
        isArchived: true,
      })); // Capture state after archive

      await api("/api/jobs/set-archive", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: jobIds,
        }),
      });

      pushUndo({
        label: "archiveMultiple",
        before: beforeJobState,
        after: afterActionJobState,
      });

      console.log("Archived selected jobs successfully.");
      setSelectedJobs([]);
      setIsMultiSelecting(false);
      return true;
    } catch (error) {
      console.error("Failed to set selected jobs as archived:", error);
      return false;
    }
  };

  const onReviewClicked = async () => {
    try {
      const jobIds = selectedJobs.map((j) => j.id);
      const beforeJobState = [...selectedJobs]; // Capture state before review
      const afterActionJobState = selectedJobs.map((job) => ({
        ...job,
        reviewNeeded: false,
      })); // Capture state after review

      await api("/api/jobs/set-review-needed", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: jobIds,
          needs_review: false,
        }),
      });

      pushUndo({
        label: "reviewMultiple",
        before: beforeJobState,
        after: afterActionJobState,
      });

      console.log("Marked selected jobs as reviewed successfully.");
      setSelectedJobs([]);
      setIsMultiSelecting(false);
      return true;
    } catch (error) {
      console.error("Failed to set selected jobs as reviewed:", error);
      return false;
    }
  };

  const onDeleteClicked = () => {
    setShowDeleteConfirm(true);
  };

  const closeDelete = () => {
    setShowDeleteConfirm(false);
  };

  const dim = "w-[35px] h-[35px]";

  return (
    <>
      <div className={className || "glass min-w-[500px] mb-10"}>
        <div className="w-full p-2 flex flex-col">
          <div className="w-full text-center">
            <p className="secondary-text animate-element">{getStatusText()}</p>
          </div>
          <hr className="header-split my-2" />
          {/* Button area */}
          <div className="w-full overflow-hidden ">
            <div className="flex w-full gap-4 py-2 items-center justify-evenly">
                  {/* Archive */}
                  <div
                    onMouseEnter={() => setHoverAction("archive")}
                    onMouseLeave={() => setHoverAction(null)}
                    className={dim}
                  >
                    <HoverIconButton
                      baseIcon={folderIcon}
                      hoverIcon={folderAddIcon}
                      successIcon={folderCheckIcon}
                      failureIcon={folderXIcon}
                      alt="Archive"
                      onClick={onArchiveClicked}
                      disabled={!isEnabled}
                      className="roundSmall"
                      style={{ background: "transparent" }}
                      hoverClassName="purpleIcon"
                      title="Mark selected jobs as archived"
                    />
                  </div>

                  {/* Mark As Reviewed */}
                  <div
                    onMouseEnter={() => setHoverAction("review")}
                    onMouseLeave={() => setHoverAction(null)}
                    className={dim}
                  >
                    <HoverIconButton
                      baseIcon={reviewIcon}
                      hoverIcon={reviewIconHover}
                      successIcon={reviewIcon}
                      failureIcon={reviewIcon}
                      alt="Mark As Reviewed"
                      onClick={onReviewClicked}
                      disabled={
                        !isEnabled || selectedJobs.every((j) => !j.reviewNeeded)
                      }
                      className="roundSmall"
                      style={{ background: "transparent" }}
                      hoverClassName="orangeIcon"
                      title="Mark selected jobs as reviewed"
                    />
                  </div>

                  {/* Delete */}
                  <div
                    onMouseEnter={() => setHoverAction("delete")}
                    onMouseLeave={() => setHoverAction(null)}
                    className={dim}
                  >
                    <HoverIconButton
                      baseIcon={trashIcon}
                      hoverIcon={trashAddIcon}
                      successIcon={trashCheckIcon}
                      failureIcon={trashXIcon}
                      alt="Delete"
                      onClick={onDeleteClicked}
                      disabled={!isEnabled}
                      className="roundSmall"
                      style={{ background: "transparent" }}
                      hoverClassName="redIcon"
                      title="Delete selected jobs"
                    />
                  </div>
            </div>
          </div>

          {/* Status text */}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Confirm Deletion"
        message="Are you sure you want to delete the selected item/s? You can undo this action from the Trash however it will be permanently deleted after 30 days."
        confirmLabel="Delete"
        isProcessing={isProcessingDelete}
        onCancel={closeDelete}
        onConfirm={async () => {
          setIsProcessingDelete(true);

          try {
            const jobIds = selectedJobs.map((j) => j.id);
            const beforeJobState = [...selectedJobs];
            const afterActionJobState = selectedJobs.map((job) => ({
              ...job,
              isDeleted: true,
            }));

            await api("/api/jobs/set-delete", {
              method: "POST",
              body: JSON.stringify({
                provider_message_ids: jobIds,
              }),
            });

            pushUndo({
              label: "deleteMultiple",
              before: beforeJobState,
              after: afterActionJobState,
            });

            console.log("Deleted selected jobs successfully.");
            setSelectedJobs([]);
            setIsMultiSelecting(false);
          } finally {
            setIsProcessingDelete(false);
            closeDelete();
          }
        }}
      />
    </>
  );
}
