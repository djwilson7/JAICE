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
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="z-60 max-w-md p-4 glass" onClick={(e) => e.stopPropagation()}>
        <h3 className="primary-text font-semibold">{title}</h3>
        {message && <p className="text-sm secondary-text mt-2">{message}</p>}
        <div className="flex gap-2 mt-4 justify-end">
          <button type="button" className="small" onClick={onCancel} disabled={isProcessing}>{cancelLabel}</button>
          <button type="button" className="small bg-red-600 text-white" onClick={() => onConfirm()} disabled={isProcessing}>
            {isProcessing ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
    return createPortal(dialog, document.body);
}