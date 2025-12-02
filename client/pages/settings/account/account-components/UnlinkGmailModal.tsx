import Button from "@/global-components/button";
import { CloseButton } from "@/global-components/CloseButton";

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
    <div className="fixed inset-0 flex items-center justify-center z-1000 modal-backdrop">
      <div className="flex relative flex-col p-6 w-[500px] shadow modal">
        <div className="flex flex-row items-center justify-between">
          <h2 className="font-semibold primary-text">Unlink Gmail Account</h2>
          <CloseButton
            onClick={() => {
              onClose();
            }}
          />
        </div>
        <hr className="header-split mb-4" />
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
        <div className="flex flex-row justify-end gap-4 mt-4">
          <Button
            onClick={() => {
              onClose();
            }}
            className="small w-1/2"
          >
            Keep Gmail Linked
          </Button>
          <Button
            onClick={() => {
              onConfirm();
            }}
            className="small red w-1/2"
          >
            Stop Gmail Syncing
          </Button>
        </div>
      </div>
    </div>
  );
}
