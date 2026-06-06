import { CloseButton } from "@/global-components/CloseButton";

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
    return (
        <div className="modal-header">
            <h2 className="modal-title">{title}</h2>
            <CloseButton onClick={onClose} />
        </div>
    );
}
