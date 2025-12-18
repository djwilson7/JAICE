import Button from "@/global-components/button";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
    const ref = useRef<HTMLDivElement>(null);
    const [descriptionExpanded, setDescriptionExpanded] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    // Reset description state when modal opens/closes
    useEffect(() => {
        if (open) {
            setDescriptionExpanded(false);
        }
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div
            aria-modal="true"
            role="dialog"
            aria-label={title ?? "Expanded view"}
            className="modal-backdrop"
            onMouseDown={(e) => {
                // click the background to close (ignores clicks inside the dialog)
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={ref}
                className="modal"
                style={{
                    width: maxWidth,
                    height: maxHeight,
                    maxHeight,
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    {/* Header */}
                    {title && (
                        <div
                            className="flex items-center justify-between"
                            style={{ marginBottom: "1rem", flexShrink: 0 }}
                        >
                            <h3 style={{ fontFamily: "var(--font-title)" }}>{title}</h3>
                            <Button onClick={onClose}>Close</Button>
                        </div>
                    )}

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
            </div>
        </div>,
        document.body
    );
}