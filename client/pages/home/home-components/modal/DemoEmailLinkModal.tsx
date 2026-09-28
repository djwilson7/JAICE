import { Modal } from "@/global-components/Modal";

export function DemoEmailLinkModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      modalTitle="Email links in the demo"
      className="max-w-md"
      primaryAction={{
        label: "Got it",
        onClick: onClose,
      }}
    >
      <p className="text-sm secondary-text">
        This button would typically take you to your inbox and open the email
        represented by this job card, so you can inspect its content directly.
        External inbox connections are disabled in this demo.
      </p>
    </Modal>
  );
}
