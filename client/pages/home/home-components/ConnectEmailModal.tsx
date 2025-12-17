import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import Button from "@/global-components/button";
import { ModalHeader } from "@/global-components/ModalHeader";
import linkIcon from "@/assets/icons/link.svg";

export default function ConnectEmailModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  const navigate = useNavigate();

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal w-lg">
        <ModalHeader title="Link Your Email" onClose={onClose} />
        <div className="flex w-full items-center justify-center">
          <div className="flex flex-col items-center justify-center">
            <div className="flex w-full justify-center">
              <small className="text-left w-7/8 text-sm primary-text">
                In order to get the most out of JAICE, please link your email.
                JAICE relies on email syncing to track job applications and
                updates automatically. Without it, some functionality is
                limited.
              </small>
            </div>

            <div className="flex w-full justify-evenly py-6">
              <div className="flex w-3/8 flex-col gap-2">
                <p className="text-sm text-left font-medium">
                  Without email syncing
                </p>
                <ul className="list-disc text-left pl-5 text-sm">
                  <li>JAICE can’t scan or organize new emails</li>
                  <li>Job updates may be missed</li>
                  <li>Applications must be tracked manually</li>
                </ul>
              </div>

              <div className="flex w-3/8 flex-col gap-2">
                <p className="text-sm text-left font-medium">
                  With email syncing
                </p>
                <ul className="list-disc text-left pl-5 text-sm">
                  <li>Emails are processed and categorized automatically</li>
                  <li>Job status changes are detected in real time</li>
                  <li>Your job search stays up to date without extra work</li>
                </ul>
              </div>
            </div>
            <div className="flex w-7/8">
              <Button
                onClick={() => navigate("/settings/account")}
                className="green"
              >
                <img
                  src={linkIcon}
                  alt="Link Icon"
                  className="w-5 h-5 icon mr-2"
                />
                <div className="ml-2 whitespace-nowrap">Link Email</div>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
