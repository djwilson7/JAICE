import { Modal } from "@/global-components/Modal";

interface UnlinkGmailModalProps {
  isOpen: boolean;
  isProcessing?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function UnlinkGmailModal({
  isOpen,
  isProcessing = false,
  error,
  onClose,
  onConfirm,
}: UnlinkGmailModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      modalTitle="Unlink Gmail Account"
      primaryAction={{
        label: isProcessing ? "Unlinking..." : "Unlink",
        onClick: onConfirm,
        className: "red",
        disabled: isProcessing,
      }}
    >
      <div className="unlink-gmail-modal-body">
        <div className="unlink-gmail-status">
          <span className="unlink-gmail-status-line" aria-hidden="true" />
          <div className="unlink-gmail-status-copy">
            <strong>Automatic email tracking will stop</strong>
            <span>
              JAICE will no longer scan or process new Gmail messages after the
              account is unlinked.
            </span>
          </div>
        </div>

        {error && (
          <p className="unlink-gmail-error" role="alert">
            {error}
          </p>
        )}

        <section className="unlink-gmail-section">
          <h3>What will change</h3>
          <ul>
            <li>New application emails will not be added automatically.</li>
            <li>Email-based stage changes will no longer be detected.</li>
            <li>Quick Sign-In through Gmail will be disabled.</li>
          </ul>
        </section>

        <p className="unlink-gmail-retention">
          <strong>Your JAICE data will remain available.</strong> Existing
          applications, notes, history, and insights are not deleted. You can
          reconnect Gmail later to resume automatic tracking.
        </p>
      </div>
    </Modal>
  );
}
