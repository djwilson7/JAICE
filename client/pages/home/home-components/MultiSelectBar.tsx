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
import type { JobCardType } from "@/types/jobCardType";
import { api } from "@/global-services/api";
import { AnimatePresence, motion } from "framer-motion";

export function MultiSelectBar({
  selectedJobs,
  setSelectedJobs,
  setIsMultiSelecting,
  onDelete,
  onArchive,
  onMove,
  className,
  setIsHighlighted,
}: {
  selectedJobs: JobCardType[];
  setSelectedJobs: (jobs: JobCardType[]) => void;
  setIsMultiSelecting: (isMultiSelecting: boolean) => void;
  onDelete: (ids: string[]) => Promise<boolean>;
  onArchive: (ids: string[]) => Promise<boolean>;
  onMove: (ids: string[], targetStage: string) => Promise<boolean>;
  className?: string;
  setIsHighlighted: (stage: string | null) => void;
}) {
  const [hoverAction, setHoverAction] = useState<
    | "move"
    | "archive"
    | "delete"
    | "applied"
    | "interview"
    | "offer"
    | "accepted"
    | "back"
    | null
  >(null);
  const [showMoveOptions, setShowMoveOptions] = useState(false);

  const handleMove = async (targetStage: string) => {
    try {
      const jobIds = selectedJobs.map((j) => j.id);
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
      if (onArchive) {
        await onArchive(jobIds);
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

      if (onDelete) {
        await onDelete(jobIds);
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

  return (
    <div
      className={
        className ||
        "fixed bottom-6 justify-center items-center flex flex-col gap-1 rounded-xl p-1 glass"
      }
    >
      <div className="w-full text-center">
        <p className="secondary-text transition-all duration-200">
          {getStatusText()}
        </p>
      </div>
      <hr className="header-split"/> 
      {/* Button area */}
      <div className="relative w-full">
        <AnimatePresence mode="wait">
          {!showMoveOptions ? (
            // Default actions
            <motion.div
              key="default"
              initial={{ y: 0, rotateX: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0, rotateX: 90 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex w-full justify-around items-center gap-4 py-2 px-8"
            >
              {/* Move */}
              <button
                onClick={() => setShowMoveOptions(true)}
                className="group small w-1/3 flex justify-center items-center"
                onMouseEnter={() => setHoverAction("move")}
                onMouseLeave={() => setHoverAction(null)}
                disabled={!isEnabled}
                style={{background: "transparent"}}
                title="Move selected jobs to a different column"
              >
                <img
                  src={replaceIcon}
                  alt="Move to new column"
                  className={`w-4 h-4 icon ${hoverAction === "move" ? "greenIcon" : ""} transition-transform duration-300 ease-in-out group-hover:-rotate-90`}
                />
              </button>

              {/* Archive */}
              <div
                onMouseEnter={() => setHoverAction("archive")}
                onMouseLeave={() => setHoverAction(null)}
                className="w-1/3 flex justify-center items-center"
              >
                <HoverIconButton
                  baseIcon={folderIcon}
                  hoverIcon={folderAddIcon}
                  successIcon={folderCheckIcon}
                  failureIcon={folderXIcon}
                  alt="Archive"
                  onClick={onArchiveClicked}
                  disabled={!isEnabled}
                  className="small w-full flex justify-center items-center"
                  style={{background: "transparent"}}
                  hoverClassName="orangeIcon"
                  title="Mark selected jobs as archived"
                />
              </div>

              {/* Delete */}
              <div
                onMouseEnter={() => setHoverAction("delete")}
                onMouseLeave={() => setHoverAction(null)}
                className="w-1/3"
              >
                <HoverIconButton
                  baseIcon={trashIcon}
                  hoverIcon={trashAddIcon}
                  successIcon={trashCheckIcon}
                  failureIcon={trashXIcon}
                  alt="Delete"
                  onClick={onDeleteClicked}
                  disabled={!isEnabled}
                  className="small w-full flex justify-center items-center"
                  style={{background: "transparent"}}
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
              {["Applied", "Interview", "Offer", "Accepted"].map((stage) => (
                <div
                  onMouseEnter={() =>
                    setHoverAction(`${stage}`.toLowerCase() as any)
                  }
                  onMouseLeave={() => setHoverAction(null)}
                  className={`w-full flex justify-center items-center ${hoverAction === `${stage}`.toLowerCase() ? "highlighted" : ""}`}
                >
                  <Button key={stage} onClick={() => handleMove(stage)} className={`small w-full items-center justify-center`} style={{background: "transparent"}}>
                    {stage}
                  </Button>
                </div>
              ))}
              <Button onClick={() => setShowMoveOptions(false)} className="small w-full items-center justify-center flex" style={{background: "transparent"}}>
                <img
                  src={upIcon}
                  alt="Move to new column"
                  className="w-5 h-5 icon transition-transform duration-300 ease-in-out group-hover:-rotate-90"
                />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status text */}
    </div>
  );
}
