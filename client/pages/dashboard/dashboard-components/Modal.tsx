import { useEffect, useState } from "react";
import { Modal as BaseModal } from "@/global-components/Modal";

type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxWidth?: string;
    maxHeight?: string;
    description?: {
        summary: string;
        calculation?: string;
        interpretation?: string;
        notes?: string;
    };
};

export function Modal({
    open,
    onClose,
    title,
    children,
    maxWidth = "min(1100px, 92vw)",
    maxHeight = "min(80vh, 820px)",
    description,
}: ModalProps) {
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    // Reset description state when modal opens/closes
    useEffect(() => {
        if (open) {
            setDescriptionExpanded(false);
        }
    }, [open]);

    if (!open) return null;

    return (
        <BaseModal
            isOpen={open}
            onClose={onClose}
            title={title}
            ariaLabel={title ?? "Expanded view"}
            closeOnBackdrop
            className=""
            contentClassName="modal-content h-full"
            style={{
                width: maxWidth,
                height: maxHeight,
                maxHeight,
            }}
        >
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Description section */}
                    {description && (
                        <div style={{ marginBottom: "1rem", flexShrink: 0 }}>
                            <button
                                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                                className="modal-description-toggle"
                                aria-expanded={descriptionExpanded}
                            >
                                <span style={{ marginRight: "0.5rem" }}>
                                    {descriptionExpanded ? "▼" : "▶"}
                                </span>
                                About this chart
                            </button>

                            {descriptionExpanded && (
                                <div className="modal-description" style={{ marginTop: "0.5rem" }}>
                                    <p className="modal-description-summary">
                                        {description.summary}
                                    </p>

                                    {description.calculation && (
                                        <p className="modal-description-detail">
                                            <span className="modal-description-label">
                                                Calculation:{" "}
                                            </span>
                                            {description.calculation}
                                        </p>
                                    )}

                                    {description.interpretation && (
                                        <p className="modal-description-detail">
                                            <span className="modal-description-label">
                                                How to use:{" "}
                                            </span>
                                            {description.interpretation}
                                        </p>
                                    )}

                                    {description.notes && (
                                        <p className="modal-description-note">
                                            <span className="modal-description-label">
                                                Note:{" "}
                                            </span>
                                            {description.notes}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Chart area - takes remaining space */}
                    <div
                        style={{
                            position: "relative",
                            width: "100%",
                            flex: 1,
                            minHeight: 0,
                            overflow: "hidden",
                        }}
                    >
                        {children}
                    </div>
                </div>
        </BaseModal>
    );
}
