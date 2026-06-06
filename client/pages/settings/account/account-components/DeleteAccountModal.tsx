import { Modal } from "@/global-components/Modal";

interface DeleteAccountModalProps {
  isOpen: boolean;
  isProcessing?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function DeleteAccountModal({
  isOpen,
  isProcessing = false,
  error,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      modalTitle="Delete Your JAICE Account"
      primaryAction={{
        label: isProcessing ? "Deleting..." : "Delete",
        onClick: onConfirm,
        className: "red",
        disabled: isProcessing,
      }}
    >
      <div className="delete-account-modal-body">
        <div className="delete-account-status">
          <span className="delete-account-status-line" aria-hidden="true" />
          <div className="delete-account-status-copy">
            <strong>This action is permanent</strong>
            <span>
              Your JAICE account and stored job-search data cannot be recovered
              after deletion.
            </span>
          </div>
        </div>

        {error && (
          <p className="delete-account-error" role="alert">
            {error}
          </p>
        )}

        <section className="delete-account-section">
          <h3>What will be removed</h3>
          <ul>
            <li>JAICE access to your connected Gmail account.</li>
            <li>Applications, notes, and job-related account data.</li>
            <li>Dashboard metrics and job-search history.</li>
            <li>Your JAICE profile and account access.</li>
          </ul>
        </section>

        <p className="delete-account-alternative">
          <strong>Need a break instead?</strong> Unlink Gmail from Account
          Settings to pause automatic syncing while keeping your applications,
          history, and insights available for later.
        </p>
      </div>
    </Modal>
  );
}
