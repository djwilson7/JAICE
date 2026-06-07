import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/global-components/Modal";
import { checkGmailStatus } from "@/pages/home/utils/checkGmailStatus";

export default function ConnectEmailModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    checkGmailStatus({ setGmailConnected, setGmailError });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      modalTitle="Email Connection Status"
      className="w-lg"
      primaryAction={{
        label: gmailConnected ? "Disconnect" : "Link",
        onClick: () => navigate("/settings"),
        className: gmailConnected ? "red" : "green",
      }}
    >
      <div className="connect-email-modal-body">
        <div
          className={`connect-email-status ${
            gmailConnected
              ? "connect-email-status-connected"
              : "connect-email-status-disconnected"
          }`}
        >
          <span className="connect-email-status-indicator" aria-hidden="true" />
          <div className="connect-email-status-copy">
            <strong>
              Gmail {gmailConnected ? "is connected" : "is not connected"}
            </strong>
            <span>
              {gmailConnected
                ? "JAICE can automatically keep your job activity current."
                : "Connect Gmail to automate job tracking from your inbox."}
            </span>
          </div>
        </div>

        {gmailError && (
          <p className="connect-email-status-error" role="alert">
            Connection status could not be refreshed. You can still manage the
            connection from Settings.
          </p>
        )}

        <p className="connect-email-intro">
          Email syncing lets JAICE identify application messages and organize
          updates as they arrive. You can still add and manage jobs manually
          when Gmail is not connected.
        </p>

        <div className="connect-email-comparison">
          <section className="connect-email-comparison-section">
            <div className="connect-email-comparison-heading connect-email-comparison-heading-connected">
              <span
                className="connect-email-comparison-icon connect-email-comparison-icon-connected"
                aria-hidden="true"
              />
              <h3>When connected</h3>
            </div>
            <ul>
              <li>New application emails are processed automatically.</li>
              <li>Status changes are organized into the correct stage.</li>
              <li>Your board stays current with less manual entry.</li>
            </ul>
          </section>

          <section className="connect-email-comparison-section">
            <div className="connect-email-comparison-heading connect-email-comparison-heading-disconnected">
              <span
                className="connect-email-comparison-icon connect-email-comparison-icon-disconnected"
                aria-hidden="true"
              />
              <h3>When disconnected</h3>
            </div>
            <ul>
              <li>Inbox messages are not scanned or categorized.</li>
              <li>Email-based job updates will not appear automatically.</li>
              <li>Applications and stage changes must be entered manually.</li>
            </ul>
          </section>
        </div>
      </div>
    </Modal>
  );
}
