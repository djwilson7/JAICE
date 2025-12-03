import Button from "@/global-components/button";
import { Modal } from "@/global-components/Modal";

interface UnlinkGmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UnlinkGmailModal({
  isOpen,
  onClose,
  onConfirm,
}: UnlinkGmailModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} modalTitle="Unlink Gmail Account">
      <div className="flex flex-col">
        <div className="flex flex-col text-left secondary-text gap-4">
          <p className="">
            Unlinking your Gmail will pause all syncing and email processing.
            Your JAICE data stays intact — you'll just need to relink Gmail if
            you want to continue using automatic tracking.
          </p>
          <p className="primary-text">
            Once unlinked, Quick Sign-In through Gmail will also be disabled
            until you reconnect.
          </p>
        </div>
      </div>
      <hr className="header-split mt-4" />
      <div className="flex flex-row justify-center gap-4 mt-4">
        <Button
          onClick={() => {
            onClose();
          }}
          className="green"
        >
          <h4>Keep Gmail Linked</h4>
        </Button>
        <Button
          onClick={() => {
            onConfirm();
          }}
          className="red"
        >
          <h4>Stop Gmail Syncing</h4>
        </Button>
      </div>
    </Modal>
  );
}
