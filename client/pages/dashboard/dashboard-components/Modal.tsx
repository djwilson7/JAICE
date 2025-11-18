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
            className="fixed inset-0 z-[100] flex items-center justify-center"
            onMouseDown={(e) => {
                // click the backgroudn to close (ignores clicks inside the dialog)
                if (e.target === e.currentTarget) onClose();
            }}
            style={{ background: "rgba(0,0,0,0.55)" }}
        >
            <div
                ref={ref}
                className="rounded-2xl"
                style={{
                    width: maxWidth,
                    height: maxHeight,
                    maxHeight,
                    padding: 16,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "linear-gradient(180deg, rgba(var(--color-blue-1-rgb),0.96) 0%, rgba(var(--color-blue-2-rgb),0.96) 100%)",
                    boxShadow: "0 18px 44px rgba(0,0,0,0.55)",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="flex items-center justify-between mb-3">
                        <h3 style={{ fontFamily: "var(--font-title)" }}>{title}</h3>
                        <button onClick={onClose} className="px-3 py-1 rounded border border-white/20">
                            Close
                        </button>
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