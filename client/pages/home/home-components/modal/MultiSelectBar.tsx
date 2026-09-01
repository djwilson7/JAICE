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

import ConfirmModal from "@/global-components/ConfirmModal";
import { useGuidedTourSession } from "@/app/layouts/guidedTourSessionContext";
import { IS_DEMO_MODE } from "@/global-services/projectMode";
import { dispatchJobLocalChange } from "@/pages/home/utils/jobLocalChangeEvent";

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
  const { homeInteractionState, recordDeletedJobIds } =
    useGuidedTourSession();

  const [hoverAction, setHoverAction] = useState<HoverAction>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);

  const selectedCount = selectedJobs.length ?? 0;

  const [isEnabled, setIsEnabled] = useState(selectedCount > 0);
  const restrictBulkActions =
    IS_DEMO_MODE &&
    ["selecting-cards", "bulk-selected", "delete-confirmation"].includes(
      homeInteractionState
    );
  const archiveAndReviewEnabled = !restrictBulkActions;
  const deleteEnabled =
    !restrictBulkActions || homeInteractionState === "bulk-selected";

  useEffect(() => {
    if (!IS_DEMO_MODE) return;
    setShowDeleteConfirm(homeInteractionState === "delete-confirmation");
  }, [homeInteractionState]);

  useEffect(() => {
    setIsEnabled(selectedCount > 0);
  }, [selectedCount]);

  useEffect(() => {
    setIsHighlighted(null);
  }, [hoverAction, setIsHighlighted]);

  if (!isMultiSelecting) return null;

  const getStatusText = () => {
    if (selectedCount === 0) {
      return "Select emails below, then tap a button to perform that action on all selected emails.";
    }
    const plural = selectedCount > 1 ? "jobs" : "job";
    const emailPlural = selectedCount > 1 ? "emails" : "email";

    switch (hoverAction) {
      case "archive":
        return `Archive ${selectedCount} ${plural}?`;
      case "delete":
        return `Delete ${selectedCount} ${plural}?`;
      case "review":
        return `Mark ${selectedCount} ${plural} as reviewed?`;
      default:
        return `${selectedCount} ${emailPlural} selected: tap archive, delete, or review all, to perform that action on these emails.`;
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

      if (IS_DEMO_MODE) {
        afterActionJobState.forEach((after, index) =>
          dispatchJobLocalChange({ before: beforeJobState[index], after })
        );
      } else {
        await api("/api/jobs/set-archive", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: jobIds,
          }),
        });
      }

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

      if (IS_DEMO_MODE) {
        afterActionJobState.forEach((after, index) =>
          dispatchJobLocalChange({ before: beforeJobState[index], after })
        );
      } else {
        await api("/api/jobs/set-review-needed", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: jobIds,
            needs_review: false,
          }),
        });
      }

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

  const dim = "multi-select-bar-action";

  return (
    <>
      <div className="home-multi-select-toolbar-wrap p-1">
        <div className={className || "multi-select-bar"}>
          <p className="multi-select-bar-status secondary-text animate-element">
            {getStatusText()}
          </p>

          <div className="multi-select-bar-actions">
            <div
              onMouseEnter={() =>
                archiveAndReviewEnabled && setHoverAction("archive")
              }
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
                disabled={!isEnabled || !archiveAndReviewEnabled}
                className="roundSmall"
                style={{ background: "transparent" }}
                hoverClassName="purpleIcon"
                title="Mark selected jobs as archived"
              />
            </div>

            <div
              onMouseEnter={() =>
                archiveAndReviewEnabled && setHoverAction("review")
              }
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
                  !isEnabled ||
                  !archiveAndReviewEnabled ||
                  selectedJobs.every((j) => !j.reviewNeeded)
                }
                className="roundSmall"
                style={{ background: "transparent" }}
                hoverClassName="orangeIcon"
                title="Mark selected jobs as reviewed"
              />
            </div>

            <div
              onMouseEnter={() => deleteEnabled && setHoverAction("delete")}
              onMouseLeave={() => setHoverAction(null)}
              className={dim}
              data-guided-tour="home-bulk-delete"
            >
              <HoverIconButton
                baseIcon={trashIcon}
                hoverIcon={trashAddIcon}
                successIcon={trashCheckIcon}
                failureIcon={trashXIcon}
                alt="Delete"
                onClick={onDeleteClicked}
                disabled={!isEnabled || !deleteEnabled}
                className="roundSmall"
                style={{ background: "transparent" }}
                hoverClassName="redIcon"
                title="Delete selected jobs"
              />
            </div>
          </div>
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

            if (IS_DEMO_MODE) {
              afterActionJobState.forEach((after, index) =>
                dispatchJobLocalChange({ before: beforeJobState[index], after })
              );
              recordDeletedJobIds(jobIds);
            } else {
              await api("/api/jobs/set-delete", {
                method: "POST",
                body: JSON.stringify({
                  provider_message_ids: jobIds,
                }),
              });
            }

            pushUndo({
              label: "deleteMultiple",
              before: beforeJobState,
              after: afterActionJobState,
            });

            console.log("Deleted selected jobs successfully.");
            if (
              !IS_DEMO_MODE ||
              homeInteractionState !== "delete-confirmation"
            ) {
              setSelectedJobs([]);
              setIsMultiSelecting(false);
            }
          } finally {
            setIsProcessingDelete(false);
            closeDelete();
          }
        }}
      />
    </>
  );
}
