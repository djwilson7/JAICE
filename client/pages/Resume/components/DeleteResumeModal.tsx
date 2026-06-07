import { Modal } from "@/global-components/Modal";
import type { SavedResume } from "../types";

type DeleteResumeModalProps = {
    resume: SavedResume | null;
    isDeleting: boolean;
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
};

export const DeleteResumeModal = ({
    resume,
    isDeleting,
    onCancel,
    onConfirm
}: DeleteResumeModalProps) => (
    <Modal
        isOpen={Boolean(resume)}
        onClose={onCancel}
        modalTitle="Delete Resume"
        className="max-w-md w-full"
        secondaryAction={{
            label: "Cancel",
            onClick: onCancel,
            disabled: isDeleting
        }}
        primaryAction={{
            label: isDeleting ? "Deleting..." : "Delete",
            onClick: onConfirm,
            className: "red",
            disabled: isDeleting
        }}
    >
        <p className="text-sm secondary-text">
            Are you sure you want to delete <strong>{resume?.name}</strong>? This action cannot be undone.
        </p>
    </Modal>
);
