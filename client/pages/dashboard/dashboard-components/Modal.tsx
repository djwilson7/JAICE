import Button from "@/global-components/button";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function Modal({
    open, onClose, title, children, maxWidth = "min(1100px, 92vw)", maxHeight = "min(80vh, 820px)",
}: {
    open: boolean,
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxWidth?: string;
    maxHeight?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);

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

    if (!open) return null;

    return createPortal(
        <div
            aria-modal="true"
            role="dialog"
            aria-label={title ?? "Expanded view"}
            className="modal-backdrop"
            onMouseDown={(e) => {
                // click the backgroudn to close (ignores clicks inside the dialog)
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
                {title && (
                    <div className="flex items-center justify-between mb-3">
                        <h3 style={{ fontFamily: "var(--font-title)" }}>{title}</h3>
                        <Button onClick={onClose}>
                            Close
                        </Button>
                    </div>
                )}
                <div style={{ position: "relative", width: "100%", height: "calc(100% - 40px)" }}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
}