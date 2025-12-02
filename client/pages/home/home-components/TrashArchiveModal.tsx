import React, { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import type { JobCardType } from "@/types/jobCardType";
import ConfirmModal from "@/global-components/ConfirmModal";
import JobCardView from "./JobCardView";
import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";

type Mode = "trash" | "archive";
type ActionName = "undelete" | "delete_permanently" | "unarchive";

export default function TrashArchiveModal({
    isOpen,
    onClose,
    mode = "trash",
    items = [],
    onAction,
}: {
    isOpen: boolean;
    onClose: () => void;
    mode?: Mode;
    items: JobCardType[]; // source data
    onAction?: (action: ActionName, ids: string[]) => Promise<void>; 
}) {
    const [list, setList] = useState<JobCardType[]>(items);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // reset list and selection when items or mode change
    useEffect(() => {
        setList(items);
        setSelected(new Set());
    }, [items, mode, isOpen]);

    // escape key and lock scroll while open
    useEffect(() => {
        function handleKey(e: KeyboardEvent) 
        {
            if (e.key === "Escape") onClose();
        }

        if (isOpen) 
        {
            document.addEventListener("keydown", handleKey);
            document.body.style.overflow = "hidden";
        } 

        return () => {
            document.removeEventListener("keydown", handleKey);
            document.body.style.overflow = "";
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // toggle selection of an item
    function toggleSelect(id: string) 
    {
        setSelected((prev) => {
            const next = new Set(prev);

            if (next.has(id)) next.delete(id);
            else next.add(id);
            
            return next;
        });
    }

    // run action on selected items
    async function runAction(action: ActionName) 
    {
        const ids = Array.from(selected);

        if (ids.length === 0) return;

        // optimistic update (remove selected items from view)
        setList((prev) => prev.filter((item) => !selected.has(item.id)));
        setSelected(new Set());

        try {
            if (onAction) 
            {
                await onAction(action, ids);
            } else {

                // unarchive
                if (action === "unarchive")
                {
                    await api("/api/jobs/set-archive", {
                        method: "POST",
                        body: JSON.stringify({ provider_message_ids: ids }),
                    });
                    
                  // restore from trash
                } else if (action === "undelete") {
                    await api("/api/jobs/restore", {
                        method: "POST",
                        body: JSON.stringify({ provider_message_ids: ids }),
                    });

                } else {
                    // delete permanently
                    await api("/api/jobs/delete", {
                        method: "POST",
                        body: JSON.stringify({ provider_message_ids: ids }),
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to ${action} items:`, error);
            setList(items);
        }
    }

    function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) 
    {
        if (e.target === e.currentTarget) onClose();
    }

    const title = mode === "trash" ? "Trash" : "Archive";
    const emptyMessage = mode === "trash" ? "No items in Trash" : "No items in Archive";

    return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <div 
        className="w-full max-w-3xl rounded-lg shadow-lg p-6 mx-4 glass" 
        style={{ background: "var(--primary-gradient)", border: "1px solid var(--color-blue-5)" }}>
        
        <div className="relative flex items-center mb-4">

          <h2 
            className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-semibold">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto addApplication"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Jobs List */}
        <div className="mb-4">
          {list.length === 0 ? (
            <p className="text-sm text-gray-400">{emptyMessage}</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {list.map((job) => (
                <li key={job.id} className="p-0">
                  <JobCardView
                    job={job}
                    compact={true}

                    // checkbox
                    leftSlot={
                      <img
                        src={selected.has(job.id) ? checkIcon : uncheckIcon}
                        alt={selected.has(job.id) ? "Selected" : "Not selected"}

                        className="w-4 h-4 opacity-60 icon cursor-pointer"

                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(job.id);
                        }}

                        onKeyDown={(e) => {

                          if (e.key === "Enter" || e.key === " ") 
                          {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelect(job.id);
                          }
                        }}

                        role="button"
                        tabIndex={0}
                        aria-pressed={selected.has(job.id)}
                        aria-label={`${selected.has(job.id) ? "Deselect" : "Select"} ${job.title}`}
                      />
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1 rounded"
            disabled={selected.size === 0}
          >
            Clear
          </button>

          <button
            onClick={() => setSelected(new Set(list.map(job => job.id)))}
            className="px-3 py-1 rounded"
          >
            Select All
          </button>

          {mode === "trash" ? (
            <>
              <button
                disabled={selected.size === 0}
                onClick={() => runAction("undelete")}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                Restore
              </button>

              <button
                disabled={selected.size === 0}
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded bg-red-600 text-white"
              >
                Delete Permanently
              </button>
            </>
          ) : (
            <>
              <button
                disabled={selected.size === 0}
                onClick={() => runAction("unarchive")}
                className="px-4 py-2 rounded bg-green-600 text-white"
              >
                Unarchive
              </button>
            </>
          )}
        </div>
      </div>
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Confirm Permanent Deletion"
        message="Are you sure you want to permanently delete the selected items? This action cannot be undone."
        confirmLabel="Delete Permanently"
        isProcessing={isProcessing}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          setIsProcessing(true);

          try {
            await runAction("delete_permanently");

          } finally {
            setIsProcessing(false);
            setShowDeleteConfirm(false);
          }
        }}
      />
    </div>
  );
}
            

