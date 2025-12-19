import trashIcon from "@/assets/icons/trash.svg";
import trashAddIcon from "@/assets/icons/trash-add.svg";
import trashCheckIcon from "@/assets/icons/trash-check.svg";
import trashXIcon from "@/assets/icons/trash-x.svg";
import folderIcon from "@/assets/icons/folder.svg";
import folderXIcon from "@/assets/icons/folder-x.svg";
import folderCheckIcon from "@/assets/icons/folder-check.svg";
import folderAddIcon from "@/assets/icons/folder-add.svg";
import replaceIcon from "@/assets/icons/replace.svg";
import upIcon from "@/assets/icons/angle-small-up.svg";
import Button, { HoverIconButton } from "@/global-components/button";
import { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import { AnimatePresence, motion } from "framer-motion";
import { useIsMultiSelecting } from "../hooks/useIsMultiSelecting";
import { useSelectedJobs } from "../hooks/useSelectedJobs";
import { useUndoRedo } from "../hooks/useUndoRedo";

export function MultiSelectBar({
  onDelete,
  onArchive,
  onMove,
  className,
  setIsHighlighted,
}: {
  onDelete: (ids: string[]) => Promise<boolean>;
  onArchive: (ids: string[]) => Promise<boolean>;
  onMove: (ids: string[], targetStage: string) => Promise<boolean>;
  className?: string;
  setIsHighlighted: (stage: string | null) => void;
}) {
  const { isMultiSelecting, setIsMultiSelecting } = useIsMultiSelecting();
  const { selectedJobs, setSelectedJobs } = useSelectedJobs();
  const { pushUndo } = useUndoRedo();

  if (!isMultiSelecting) return null;

  const [hoverAction, setHoverAction] = useState<
    | "move"
    | "archive"
    | "delete"
    | "applied"
    | "interview"
    | "offer"
    | "accepted"
    | "rejected"
    | "back"
    | null
  >(null);
  const [showMoveOptions, setShowMoveOptions] = useState(false);

  const handleMove = async (targetStage: string) => {
    try {
      const jobIds = selectedJobs.map((j) => j.id);
      const beforeJobState = [...selectedJobs]; // Capture state before move
      const afterActionJobState = selectedJobs.map((job) => ({
        ...job,
        app_stage: targetStage,
      })); // Capture state after move

      if (onMove) {
        await onMove(jobIds, targetStage);
      } else {
        await api("/api/jobs/update-stage", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: jobIds,
            app_stage: targetStage,
          }),
        });
      }
      pushUndo({ label: "moveMultiple", before: beforeJobState, after: afterActionJobState });
      console.log(`Moved ${selectedCount} jobs to ${targetStage}.`);
      setSelectedJobs([]);
      setShowMoveOptions(false);
      setIsMultiSelecting(false);
      setIsHighlighted(null);
    } catch (err) {
      console.error("Failed to move jobs:", err);
    }
  };

  const selectedCount = selectedJobs.length ?? 0;

  const [isEnabled, setIsEnabled] = useState(selectedCount > 0);

  useEffect(() => {
    setIsEnabled(selectedCount > 0);
  }, [selectedCount]);

  const getStatusText = () => {
    if (selectedCount === 0) return "Select jobs to see actions.";
    const plural = selectedCount > 1 ? "jobs" : "job";

    switch (hoverAction) {
      case "move":
        setIsHighlighted("all");
        return `Move ${selectedCount} ${plural} to a new column?`;
      case "archive":
        setIsHighlighted(null);
        return `Archive ${selectedCount} ${plural}?`;
      case "delete":
        setIsHighlighted(null);
        return `Delete ${selectedCount} ${plural}?`;
      case "applied":
        setIsHighlighted("applied");
        return `Move ${selectedCount} ${plural} to applied?`;
      case "interview":
        setIsHighlighted("interview");
        return `Move ${selectedCount} ${plural} to interview?`;
      case "offer":
        setIsHighlighted("offer");
        return `Move ${selectedCount} ${plural} to offer?`;
      case "accepted":
        setIsHighlighted("accepted");
        return `Move ${selectedCount} ${plural} to accepted?`;
      case "rejected":
        setIsHighlighted("rejected");
        return `Move ${selectedCount} ${plural} to rejected?`;
      case "back":
        setIsHighlighted(null);
        return `Back to main actions.`;
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
      if (onArchive) {
        await onArchive(jobIds);
        pushUndo({ label: "archiveMultiple", before: beforeJobState, after: afterActionJobState });
      } else {
        await api("/api/jobs/set-archive", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: jobIds,
          }),
        });
      }
      console.log("Archived selected jobs successfully.");
      setSelectedJobs([]);
      setIsMultiSelecting(false);
      return true;
    } catch (error) {
      console.error("Failed to set selected jobs as archived:", error);
      return false;
    }
  };

  const onDeleteClicked = async () => {
    try {
      const jobIds = selectedJobs.map((j) => j.id);
      const beforeJobState = [...selectedJobs];
      const afterActionJobState = selectedJobs.map((job) => ({
        ...job,
        isDeleted: true,
      })); 
      if (onDelete) {
        await onDelete(jobIds);
        pushUndo({ label: "deleteMultiple", before: beforeJobState, after: afterActionJobState }); // Push undo action here
      } else {
        await api("/api/jobs/set-delete", {
          method: "POST",
          body: JSON.stringify({
            provider_message_ids: jobIds,
          }),
        });
      }
      console.log("Deleted selected jobs successfully.");
      setSelectedJobs([]);
      setIsMultiSelecting(false);
      return true;
    } catch (error) {
      console.error("Failed to set selected jobs as deleted:", error);
      return false;
    }
  };
  const dim = "w-[35px] h-[35px]";
  const labelDim = "w-[90px] h-[50px]";

  return (
    <div className={className || "glass min-w-[500px]"}>
      <div className="w-full p-2 flex flex-col">
        <div className="w-full text-center">
          <p className="secondary-text animate-element">{getStatusText()}</p>
        </div>
        <hr className="header-split my-2" />
        {/* Button area */}
        <div className="w-full overflow-hidden ">
          <AnimatePresence mode="wait">
            {!showMoveOptions ? (
              // Default actions
              <motion.div
                key="default"
                initial={{ y: 0, rotateX: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0, rotateX: 90 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex w-full gap-4 py-2 items-center justify-evenly"
              >
                {/* Move */}
                <div className={dim}>
                  <Button
                    onClick={() => setShowMoveOptions(true)}
                    className="group roundSmall"
                    onMouseEnter={() => setHoverAction("move")}
                    onMouseLeave={() => setHoverAction(null)}
                    disabled={!isEnabled}
                    style={{ background: "transparent" }}
                    title="Move selected jobs to a different column"
                  >
                    <img
                      src={replaceIcon}
                      alt="Move to new column"
                      className={`flex w-full h-full icon animate-element group-hover:-rotate-90 ${
                        hoverAction === "move" ? "greenIcon" : ""
                      }`}
                    />
                  </Button>
                </div>

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
                    hoverClassName="orangeIcon"
                    title="Mark selected jobs as archived"
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
              </motion.div>
            ) : (
              // Move options
              <motion.div
                key="move"
                initial={{ y: 40, opacity: 0, rotateX: -90 }}
                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                exit={{ y: 40, opacity: 0, rotateX: 90 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="flex flex-col sm:flex-row justify-around items-center gap-4 py-2 px-4"
              >
                {["Applied", "Interview", "Offer", "Accepted", "Rejected"].map(
                  (stage) => (
                    <div
                      onMouseEnter={() =>
                        setHoverAction(`${stage}`.toLowerCase() as any)
                      }
                      onMouseLeave={() => setHoverAction(null)}
                      className={`${labelDim} ${
                        hoverAction === `${stage}`.toLowerCase()
                          ? "highlighted"
                          : ""
                      }`}
                    >
                      <Button
                        key={stage}
                        onClick={() => handleMove(stage)}
                        className={`ovalSmall`}
                        style={{ background: "transparent" }}
                      >
                        <p className="animate-element primary-text">{stage}</p>
                      </Button>
                    </div>
                  )
                )}
                <div className={dim}>
                  <Button
                    onClick={() => setShowMoveOptions(false)}
                    className="roundSmall"
                    style={{ background: "transparent" }}
                  >
                    <img
                      src={upIcon}
                      alt="Move to new column"
                      className="icon transition-transform duration-300 ease-in-out group-hover:-rotate-90"
                    />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status text */}
      </div>
    </div>
  );
}
