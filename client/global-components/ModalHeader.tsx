import { CloseButton } from "@/global-components/CloseButton";

interface ModalHeaderProps {
    title: string;
    onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
    return (
        <div className="flex relative items-center mb-4">
            <h2 className="flex w-full justify-center items-center font-semibold">
                {title}
            </h2>
            <CloseButton onClick={onClose} />
        </div>
    );
}