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
import { HoverIconButton } from "@/global-components/button";
import { useState } from "react";
import type { JobCardType } from "@/types/jobCardType";
import { api } from "@/global-services/api";
import { AnimatePresence, motion } from "framer-motion";

export function MultiSelectBar({
  selectedJobs,
  setSelectedJobs,
  setIsMultiSelecting,
  className,
}: {
  selectedJobs: JobCardType[];
  setSelectedJobs: (jobs: JobCardType[]) => void;
  setIsMultiSelecting: (isMultiSelecting: boolean) => void;
  className?: string;
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
      await api("/api/jobs/update-stage", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: jobIds,
          app_stage: targetStage,
        }),
      });
      console.log(`Moved ${selectedCount} jobs to ${targetStage}.`);
      setSelectedJobs([]);
      setShowMoveOptions(false);
      setIsMultiSelecting(false);
    } catch (err) {
      console.error("Failed to move jobs:", err);
    }
  };

  const selectedCount = selectedJobs.length ?? 0;

  const getStatusText = () => {
    if (selectedCount === 0) return "No jobs selected.";
    const plural = selectedCount > 1 ? "jobs" : "job";

    switch (hoverAction) {
      case "move":
        return `Move ${selectedCount} ${plural} to a new column?`;
      case "archive":
        return `Archive ${selectedCount} ${plural}?`;
      case "delete":
        return `Delete ${selectedCount} ${plural}?`;
      case "applied":
        return `Move ${selectedCount} ${plural} to applied?`;
      case "interview":
        return `Move ${selectedCount} ${plural} to interview?`;
      case "offer":
        return `Move ${selectedCount} ${plural} to offer?`;
      case "accepted":
        return `Move ${selectedCount} ${plural} to accepted?`;
      case "back":
        return `Back to main actions.`;
      default:
        return `${selectedCount} ${plural} selected.`;
    }
  };

  const onArchive = async () => {
    try {
      const jobIds = selectedJobs.map((j) => j.id);

      await api("/api/jobs/set-archive", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: jobIds,
        }),
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

  const onDelete = async () => {
    try {
      const jobIds = selectedJobs.map((j) => j.id);

      await api("/api/jobs/set-delete", {
        method: "POST",
        body: JSON.stringify({
          provider_message_ids: jobIds,
        }),
      });
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
        "fixed bottom-2 w-1/2 md:w-[40rem] justify-center items-center flex flex-col bg-black/60 rounded-xl p-3 gap-2 backdrop-blur-md border border-white/10 shadow-lg"
      }
    >
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
              className="flex justify-around items-center gap-5"
            >
              {/* Move */}
              <button
                onClick={() => setShowMoveOptions(true)}
                className="group"
                onMouseEnter={() => setHoverAction("move")}
                onMouseLeave={() => setHoverAction(null)}
              >
                <img
                  src={replaceIcon}
                  alt="Move to new column"
                  className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-rotate-90"
                />
              </button>

              {/* Archive */}
              <div
                onMouseEnter={() => setHoverAction("archive")}
                onMouseLeave={() => setHoverAction(null)}
              >
                <HoverIconButton
                  baseIcon={folderIcon}
                  hoverIcon={folderAddIcon}
                  successIcon={folderCheckIcon}
                  failureIcon={folderXIcon}
                  alt="Archive"
                  onClick={onArchive}
                />
              </div>

              {/* Delete */}
              <div
                onMouseEnter={() => setHoverAction("delete")}
                onMouseLeave={() => setHoverAction(null)}
              >
                <HoverIconButton
                  baseIcon={trashIcon}
                  hoverIcon={trashAddIcon}
                  successIcon={trashCheckIcon}
                  failureIcon={trashXIcon}
                  alt="Delete"
                  onClick={onDelete}
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
              className="flex flex-col sm:flex-row justify-around items-center gap-3"
            >
              {["Applied", "Interview", "Offer", "Accepted"].map((stage) => (
                <div
                  onMouseEnter={() =>
                    setHoverAction(`${stage}`.toLowerCase() as any)
                  }
                  onMouseLeave={() => setHoverAction(null)}
                >
                  <button key={stage} onClick={() => handleMove(stage)}>
                    {stage}
                  </button>
                </div>
              ))}
              <button onClick={() => setShowMoveOptions(false)}>
                <img
                  src={upIcon}
                  alt="Move to new column"
                  className="w-5 h-5 transition-transform duration-300 ease-in-out group-hover:-rotate-90"
                />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status text */}
      <div className="w-full text-center">
        <p className="text-sm text-gray-200 transition-all duration-200">
          {getStatusText()}
        </p>
      </div>
    </div>
  );
}
