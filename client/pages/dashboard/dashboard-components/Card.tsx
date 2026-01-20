import React from "react";

type Variant = "teal" | "solid";
type Size = "sm" | "md" | "lg";

export type CardProps = {
    title?: string;
    subtitle?: string;
    titleIcon?: React.ReactNode;
    className?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    variant?: Variant;
    size?: Size;
    height?: number | string;
    rounded?: boolean;
    expandable?: boolean;
    onExpand?: () => void;
};

function useCardStyles(variant: Variant, rounded: boolean) {
    const base: React.CSSProperties = {
        position: "relative",
        borderRadius: rounded ? 22 : 16,
        padding: 20,
        color: "var(--primary-five)",
        border: "1px solid rgba(var(--primary-five-rgb), 0.35)",
        boxShadow: "0 10px 24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)",
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
    };

    if (variant === "teal") {
        base.background = `var(--primary-gradient)`;
    } else {
        base.background = "rgb(var(--primary-one-rgb))";
    }

    return base;
}

export function Card({
    title, subtitle, titleIcon, className = "", children, footer,
    variant = "teal", size = "md", height, rounded = true,
    expandable, onExpand }: CardProps) {
    const style = useCardStyles(variant, rounded);

    const bodyHeight = height != null ? typeof height === "number"
                                    ? `${height}px` : height
                                    : size === "lg" ? "14rem"
                                    : size === "md" ? "12rem"
                                    : "9rem";

    return (
        <section
            className={className}
            style={{ ...style, display: "flex", flexDirection: "column" }}
            onClick={expandable ? onExpand : undefined}
            onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 28px rgba(0,0,0,0.42), inset 0 0 0 1px rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 24px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.04)";
                (e.currentTarget as HTMLElement).style.transform = "none";
            }}
        >
            {(title || subtitle) && (
                <header style={{ marginBottom: 10, textAlign: "center" }}>
                    {title && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <h2 style={{
                                fontFamily: "var(--font-title)",
                                fontSize: "var(--fs-headline)",
                                letterSpacing: "0.5px",
                                margin: "2px 0 6px",
                            }}
                            >
                                {title}
                            </h2>
                            {titleIcon && <div style={{ display: "flex", alignItems: "center" }}>{titleIcon}</div>}
                        </div>
                    )}
                    {subtitle && (
                        <div style={{
                            fontSize: "var(--fs-caption)",
                            opacity: 0.85,
                            marginBottom: 2,
                        }}
                        >
                            {subtitle}
                        </div>
                    )}
                </header>
            )}

            {/* Body container sets a consistent height for charts/metrics */}
            <div
                className={`card-body ${expandable ? "cursor-pointer" : ""}`}
                style={{
                    flex: 1,
                    minHeight: bodyHeight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                }}
                role={expandable ? "button" : undefined}
                tabIndex={expandable ? 0 : undefined}
                onKeyDown={
                    expandable ? (e) => (e.key === "Enter" || e.key === " ") && onExpand?.() : undefined
                }
                aria-label={expandable ? "Expand chart" : undefined}
            >
                {expandable && (
                    <div
                        style={{
                            position: "absolute",
                            right: 8,
                            top: -24,
                            fontSize: 12,
                            opacity: 0.8,
                        }}
                    >
                        Click anywhere to expand
                    </div>
                )}
                {children}
            </div>

            {footer && <footer style={{ marginTop: 12 }}>{footer}</footer>}
        </section>
    );
}

/* ------------------------ Helpers for quick metric tiles + chart host ------------------------------------------- */

export function Metric({ value, label, valueSize = "clamp(48px, 8vw, 86px)", }: {
    value: string | number;
    label?: string;
    valueSize?: string;
}) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{
                fontFamily: "var(--font-title)",
                fontWeight: 600,
                fontSize: valueSize,
                lineHeight: 0.95,
            }}
            >
                {value}
            </div>
            {label && (
                <div style={{ marginTop: 8, fontSize: 18, opacity: 0.95 }}>{label}</div>
            )}
        </div>
    );
}

/* Wrap Chart.js canvas in this so the card controls size */
export function ChartHost({ children, inset = 0, }: {
    children: React.ReactNode;
    inset?: number;
}) {
    return (
        <div
            style={{
                position: "relative",
                inset: inset,
                width: "100%",
                height: "100%",
            }}
        >
            {children}
        </div>
    );
}