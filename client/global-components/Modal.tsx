import { createPortal } from "react-dom";
import { ModalHeader } from "@/global-components/ModalHeader";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  modalTitle: string;
}

export function Modal({ isOpen, onClose, children, modalTitle }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" >
      <div className="modal w-lg">
        <ModalHeader title={modalTitle} onClose={onClose} />
        <hr className="header-split" />
        <div className="modal-content">{children}</div>
      </div>
    </div>,
    document.body
  );
}
