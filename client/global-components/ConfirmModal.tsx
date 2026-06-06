import React from "react";
import { Modal } from "@/global-components/Modal";

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  isProcessing = false,
}: {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
  confirmLabel?: string;
  isProcessing?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      modalTitle={title}
      className="max-w-md"
      primaryAction={{
        label: isProcessing ? "Working" : confirmLabel,
        onClick: onConfirm,
        className: "small red",
        disabled: isProcessing,
      }}
    >
      {message && <div className="text-sm secondary-text">{message}</div>}
    </Modal>
  );
}
