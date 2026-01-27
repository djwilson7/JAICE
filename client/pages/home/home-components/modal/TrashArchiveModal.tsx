import { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import type { JobCardType } from "@/types/jobCardType";
import ConfirmModal from "@/global-components/ConfirmModal";
import JobCardView from "@/pages/home/home-components/job-card/JobCardView";
import checkIcon from "@/assets/icons/check-icon.svg";
import uncheckIcon from "@/assets/icons/uncheck-icon.svg";
import { ModalHeader } from "@/global-components/ModalHeader";
import { createPortal } from "react-dom";

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
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    if (isOpen) {
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
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }

  // run action on selected items
  async function runAction(action: ActionName) {
    const ids = Array.from(selected);

    if (ids.length === 0) return;

    // optimistic update (remove selected items from view)
    setList((prev) => prev.filter((item) => !selected.has(item.id)));
    setSelected(new Set());

    try {
      if (onAction) {
        await onAction(action, ids);
      } else {
        // unarchive
        if (action === "unarchive") {
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
          await api("/api/jobs/permanently-delete", {
            method: "POST",
            body: JSON.stringify({
              provider_message_ids: ids,
              confirm: true,
            }),
          });
        }
      }
    } catch (error) {
      console.error(`Failed to ${action} items:`, error);
      setList(items);
    }
  }

  const title = mode === "trash" ? "Trash" : "Archive";
  const emptyMessage =
    mode === "trash" ? "No items in Trash" : "No items in Archive";

  const handleSelectAll = () => {
    if (selected.size === list.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(list.map((job) => job.id)));
    }
  };

  const selectAllLabel =
    selected.size === list.length && list.length > 0
      ? "Clear All"
      : "Select All";

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal w-lg">
        <ModalHeader title={title} onClose={onClose} />

        {/* Jobs List */}
        <div className="mb-4">
          {list.length === 0 ? (
            <p className="text-center secondary-text">{emptyMessage}</p>
          ) : (
            <ul className="space-y-2 px-2 max-h-72 overflow-auto">
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
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSelect(job.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected.has(job.id)}
                        aria-label={`${
                          selected.has(job.id) ? "Deselect" : "Select"
                        } ${job.title}`}
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
            disabled={list.length === 0} // If there is nothing to select or clear disable the button
            onClick={handleSelectAll} // Select or Clear all items
            className=""
          >
            {selectAllLabel}
          </button>

          {mode === "trash" ? (
            <>
              <button
                disabled={list.length === 0 && selected.size === 0} // If there is nothing to restore disable the button
                onClick={() => runAction("undelete")}
                className="green"
              >
                Restore
              </button>

              <button
                disabled={list.length === 0 && selected.size === 0} // If there is nothing to delete disable the button
                onClick={() => setShowDeleteConfirm(true)}
                className="red"
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                disabled={list.length === 0 && selected.size === 0} // If there is nothing to unarchive disable the button
                onClick={() => runAction("unarchive")}
                className="green"
              >
                Restore
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
    </div>,
    document.body
  );
}
