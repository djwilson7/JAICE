import React from "react";
import { createPortal } from "react-dom";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isProcessing = false,
}: {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
}) {
  if (!isOpen) return null;

  const dialog = (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="primary-text text-center font-semibold">{title}</h3>
        {message && <p className="text-sm secondary-text mt-2">{message}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button
            type="button"
            className="small"
            onClick={onCancel}
            disabled={isProcessing}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="small red"
            onClick={() => onConfirm()}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(dialog, document.body);
}
