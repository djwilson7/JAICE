import Button from "@/global-components/button";
import { Modal } from "@/global-components/Modal";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      modalTitle="Delete Your JAICE Account"
    >
      <div className="flex flex-col">
        <div className="flex flex-col text-left secondary-text gap-2">
          <h3 className="primary-text">
            Thinking about deleting your JAICE account?
          </h3>
          <p className="">Before you go, here's what this action will do:</p>
          <ul className="list-disc list-inside text-left">
            <li>Remove JAICE's access to your Gmail</li>
            <li>Erase all job-related data stored on your account</li>
            <li>Erase all metrics related to your job search</li>
            <li>Permanently close your JAICE profile</li>
          </ul>
          <p className="mt-4 primary-text">If you've:</p>
          <ul className="list-disc list-inside text-left primary-text">
            <li>Landed a job</li>
            <li>Need a break</li>
            <li>Just don't need JAICE right now</li>
          </ul>
          <p className="primary-text mt-2">
            You can unlink your Gmail to pause everything. When you return, your
            history and insights will be right here — a steady reference for
            your next step up.
          </p>
          <p className="mt-2 primary-text">
            Deleting your account removes all of that permanently.
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
          <h4>I'll Unlink Instead</h4>
        </Button>
        <Button
          onClick={() => {
            onConfirm();
          }}
          className="red"
        >
          <h4>Delete My Account</h4>
        </Button>
      </div>
    </Modal>
  );
}
