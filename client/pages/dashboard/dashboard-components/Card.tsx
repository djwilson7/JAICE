import React from "react";
import { createPortal } from "react-dom";
import infoIcon from "@/assets/icons/info.svg";
import { useSettings } from "@/pages/settings/provider/settingsContext";
import { getDashboardChartTheme } from "./chartTheme";

type Variant = "teal" | "solid";
type Size = "sm" | "md" | "lg";

export type CardInfoDescription = {
    summary: string;
    calculation?: string;
    interpretation?: string;
    notes?: string;
};

export type CardProps = {
    title?: string;
    subtitle?: string;
    titleIcon?: React.ReactNode;
    infoDescription?: CardInfoDescription;
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
        borderRadius: rounded ? 8 : 6,
        padding: 16,
        color: "var(--primary-five)",
        border: "1px solid rgba(var(--primary-five-rgb), 0.14)",
        borderTopColor: "rgba(var(--primary-five-rgb), 0.22)",
        borderLeftColor: "rgba(var(--primary-five-rgb), 0.18)",
        boxShadow: "none",
        backgroundClip: "padding-box",
    };

    if (variant === "teal") {
        base.background = "var(--card-surface)";
    } else {
        base.background = "rgb(var(--primary-one-rgb))";
    }

    return base;
}

export function Card({
    title, subtitle, titleIcon, infoDescription, className = "", children, footer,
    variant = "teal", size = "md", height, rounded = true,
    expandable, onExpand }: CardProps) {
    const style = useCardStyles(variant, rounded);
    const [showInfo, setShowInfo] = React.useState(false);
    const infoButtonRef = React.useRef<HTMLButtonElement>(null);

    // Used as minHeight on the body — gives chart cards a sensible floor so the
    // CSS Grid track has a real size to equalize against. The grid then stretches
    // all siblings in the same row to match the tallest card automatically.
    const bodyMinHeight = height === "auto"
        ? undefined
        : height != null
            ? typeof height === "number" ? `${height}px` : height
            : size === "lg" ? "14rem"
            : size === "md" ? "12rem"
            : "9rem";
    const isAutoHeight = height === "auto";
    const tooltipWidth = 360;
    const tooltipRect = infoButtonRef.current?.getBoundingClientRect();
    const tooltipPosition = tooltipRect && typeof window !== "undefined"
        ? {
            top: tooltipRect.bottom + 8,
            left: Math.min(
                window.innerWidth - tooltipWidth - 12,
                Math.max(12, tooltipRect.left + tooltipRect.width / 2 - tooltipWidth / 2),
            ),
        }
        : null;
    const infoSnippets = infoDescription
        ? [
            { label: "What it shows", text: infoDescription.summary },
            infoDescription.calculation
                ? { label: "How it works", text: infoDescription.calculation }
                : null,
            infoDescription.interpretation
                ? { label: "How to use it", text: infoDescription.interpretation }
                : null,
            infoDescription.notes ? { label: "Note", text: infoDescription.notes } : null,
        ].filter((snippet): snippet is { label: string; text: string } => Boolean(snippet))
        : [];

    return (
        <section
            className={`card ${className}`}
            style={{ ...style, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}
            onClick={expandable ? onExpand : undefined}
        >
            {(title || subtitle) && (
                <header style={{ marginBottom: 12, paddingRight: expandable ? 84 : 0, textAlign: "left" }}>
                    {title && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8 }}>
                            <h2 style={{
                                fontFamily: "var(--font-title)",
                                fontSize: "clamp(1rem, 1.35vw, 1.25rem)",
                                letterSpacing: 0,
                                lineHeight: 1.05,
                                margin: 0,
                            }}
                            >
                                {title}
                            </h2>
                            {titleIcon && <div style={{ display: "flex", alignItems: "center" }}>{titleIcon}</div>}
                            {infoDescription && (
                                <button
                                    ref={infoButtonRef}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowInfo((current) => !current);
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onMouseEnter={() => setShowInfo(true)}
                                    onMouseLeave={() => setShowInfo(false)}
                                    onFocus={() => setShowInfo(true)}
                                    onBlur={() => setShowInfo(false)}
                                    className="inline-flex items-center justify-center"
                                    style={{
                                        width: 18,
                                        height: 18,
                                        border: "none",
                                        background: "transparent",
                                        padding: 2,
                                        cursor: "help",
                                        opacity: 0.58,
                                    }}
                                    aria-label={`About ${title}`}
                                >
                                    <img
                                        src={infoIcon}
                                        alt=""
                                        style={{
                                            width: 14,
                                            height: 14,
                                            filter: "var(--icon-filter)",
                                        }}
                                    />
                                </button>
                            )}
                        </div>
                    )}
                    {subtitle && (
                        <div style={{
                            fontSize: "var(--fs-caption)",
                            opacity: 0.85,
                            marginTop: 1,
                            marginBottom: 0,
                        }}
                        >
                            {subtitle}
                        </div>
                    )}
                </header>
            )}

            {expandable && (
                <div
                    style={{
                        position: "absolute",
                        right: 20,
                        top: 20,
                        fontSize: 12,
                        opacity: 0.8,
                    }}
                >
                Tap to open
                </div>
            )}

            {showInfo && infoDescription && tooltipPosition && typeof document !== "undefined" && createPortal(
                <div
                    role="tooltip"
                    style={{
                        position: "fixed",
                        top: tooltipPosition.top,
                        left: tooltipPosition.left,
                        width: tooltipWidth,
                        maxWidth: "calc(100vw - 24px)",
                        zIndex: 10000,
                        border: "1px solid rgba(var(--primary-five-rgb), 0.24)",
                        borderRadius: 12,
                        background: "rgba(var(--primary-one-rgb), 0.82)",
                        backdropFilter: "blur(16px) saturate(1.25)",
                        WebkitBackdropFilter: "blur(16px) saturate(1.25)",
                        boxShadow: "0 18px 40px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(var(--primary-five-rgb), 0.06)",
                        color: "var(--primary-five)",
                        padding: 14,
                        textAlign: "left",
                        pointerEvents: "none",
                    }}
                >
                    {infoSnippets.map((snippet, index) => (
                        <InfoSnippet
                            key={snippet.label}
                            label={snippet.label}
                            text={snippet.text}
                            isLast={index === infoSnippets.length - 1}
                        />
                    ))}
                </div>,
                document.body
            )}

            {/* Body: auto-height cards (e.g. GritCard) use flexShrink:0 so their
                 content drives the grid track size. Fixed-height cards use flex:1
                 + minHeight so they have a floor and fill any extra grid row space. */}
            <div
                className={`card-body ${expandable ? "cursor-pointer" : ""}`}
                style={isAutoHeight ? {
                    flexShrink: 0,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                } : {
                    flex: 1,
                    minHeight: bodyMinHeight,
                    minWidth: 0,
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
                {children}
            </div>

            {footer && <footer style={{ marginTop: 12 }}>{footer}</footer>}
        </section>
    );
}

function InfoSnippet({
    label,
    text,
    isLast,
}: {
    label: string;
    text: string;
    isLast: boolean;
}) {
    return (
        <div
            style={{
                padding: "8px 0",
                borderBottom: isLast ? "none" : "1px solid rgba(var(--primary-five-rgb), 0.1)",
            }}
        >
            <div
                style={{
                    marginBottom: 3,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    opacity: 0.7,
                    textTransform: "uppercase",
                }}
            >
                {label}
            </div>
            <p
                style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.45,
                    opacity: 0.92,
                }}
            >
                {text}
            </p>
        </div>
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
                position: "absolute",
                inset: inset,
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
            }}
        >
            {children}
        </div>
    );
}

export function ChartError({ message }: { message: string }) {
    return (
        <div className="flex h-full items-center justify-center text-sm text-red-400">
            {message}
        </div>
    );
}

export type ChartLegendItem = {
    label: string;
    color: string;
};

export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
    const { theme } = useSettings();
    const chartTheme = getDashboardChartTheme(theme);

    return (
        <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="flex items-center gap-2 text-[7px] font-medium leading-none"
                    style={{ letterSpacing: "1.4px", color: chartTheme.legend }}
                >
                    <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: item.color }}
                    />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

type ChartSkeletonVariant = "line" | "bar" | "donut" | "heatmap" | "tiles" | "grit";

const skeletonBase = "animate-pulse rounded-md bg-[rgba(var(--primary-five-rgb),0.12)]";

export function ChartSkeleton({ variant = "line" }: { variant?: ChartSkeletonVariant }) {
    const { theme } = useSettings();
    const chartTheme = getDashboardChartTheme(theme);

    if (variant === "grit") {
        return (
            <div className="grid h-full w-full grid-cols-1 items-center gap-5 lg:grid-cols-3">
                <div className="flex flex-col items-center justify-center gap-3">
                    <div className={`${skeletonBase} h-24 w-32 md:h-32 md:w-44`} />
                    <div className={`${skeletonBase} h-8 w-36`} />
                </div>
                <div className="flex flex-col gap-5 lg:col-span-2">
                    <div className={`${skeletonBase} h-8 w-full`} />
                    <div className="grid grid-cols-3 gap-3">
                        <div className={`${skeletonBase} h-20`} />
                        <div className={`${skeletonBase} h-20`} />
                        <div className={`${skeletonBase} h-20`} />
                    </div>
                </div>
            </div>
        );
    }

    if (variant === "donut") {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-6">
                <div className={`${skeletonBase} h-36 w-36 rounded-full md:h-44 md:w-44`} />
                <div className="flex w-full max-w-sm justify-center gap-5">
                    <div className={`${skeletonBase} h-3 w-16`} />
                    <div className={`${skeletonBase} h-3 w-20`} />
                    <div className={`${skeletonBase} h-3 w-14`} />
                </div>
            </div>
        );
    }

    if (variant === "heatmap") {
        return (
            <div className="grid h-full w-full grid-cols-12 grid-rows-7 gap-1">
                {Array.from({ length: 84 }).map((_, index) => (
                    <div
                        key={index}
                        className={`${skeletonBase} rounded-sm`}
                        style={{ opacity: 0.35 + (index % 5) * 0.08 }}
                    />
                ))}
            </div>
        );
    }

    if (variant === "tiles") {
        return (
            <div className="grid h-full w-full grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className={`rounded-2xl border ${chartTheme.tile.border} ${chartTheme.tile.background} p-4`}>
                        <div className={`${skeletonBase} mb-8 h-3 w-24`} />
                        <div className={`${skeletonBase} h-8 w-28`} />
                        <div className={`${skeletonBase} mt-4 h-3 w-full`} />
                    </div>
                ))}
            </div>
        );
    }

    if (variant === "bar") {
        return (
            <div className="relative h-full w-full animate-pulse px-3 pb-6 pt-3">
                <div
                    className="absolute inset-x-3 bottom-6 top-3"
                    style={{
                        background:
                            "linear-gradient(to top, rgba(var(--primary-five-rgb),0.08) 1px, transparent 1px)",
                        backgroundSize: "100% 25%",
                    }}
                />
                <div className="absolute bottom-6 left-3 right-3 border-b border-[rgba(var(--primary-five-rgb),0.25)]" />
                <div className="absolute bottom-6 left-3 top-3 border-l border-[rgba(var(--primary-five-rgb),0.25)]" />
                <div className="relative z-10 flex h-full items-end gap-3">
                    {[42, 68, 52, 84, 60, 72, 48, 76].map((height, index) => (
                        <div key={index} className="flex flex-1 flex-col justify-end pb-6">
                            <div className={skeletonBase} style={{ height: `${height}%` }} />
                        </div>
                    ))}
                </div>
                <div className="absolute bottom-0 left-8 right-4 flex justify-between">
                    <div className={`${skeletonBase} h-2 w-10`} />
                    <div className={`${skeletonBase} h-2 w-10`} />
                    <div className={`${skeletonBase} h-2 w-10`} />
                </div>
            </div>
        );
    }

    if (variant === "line") {
        return (
            <div className="relative h-full w-full animate-pulse px-3 pb-6 pt-3">
                <div
                    className="absolute inset-x-3 bottom-6 top-3"
                    style={{
                        background:
                            "linear-gradient(to top, rgba(var(--primary-five-rgb),0.08) 1px, transparent 1px), linear-gradient(to right, rgba(var(--primary-five-rgb),0.06) 1px, transparent 1px)",
                        backgroundSize: "100% 25%, 16.66% 100%",
                    }}
                />
                <div className="absolute bottom-6 left-3 right-3 border-b border-[rgba(var(--primary-five-rgb),0.25)]" />
                <div className="absolute bottom-6 left-3 top-3 border-l border-[rgba(var(--primary-five-rgb),0.25)]" />
                <svg
                    className="absolute inset-x-3 bottom-6 top-3 h-[calc(100%-2.25rem)] w-[calc(100%-1.5rem)]"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                >
                    <path
                        d="M0 78 C12 74 18 62 28 64 C42 66 43 30 55 28 C67 26 68 58 78 55 C88 52 91 36 100 40"
                        fill="none"
                        stroke="rgba(var(--primary-five-rgb),0.22)"
                        strokeLinecap="round"
                        strokeWidth="4"
                    />
                    <path
                        d="M0 62 C14 58 21 48 32 50 C46 52 52 76 66 70 C78 65 84 48 100 52"
                        fill="none"
                        stroke="rgba(var(--primary-five-rgb),0.12)"
                        strokeLinecap="round"
                        strokeWidth="4"
                    />
                </svg>
                <div className="absolute bottom-0 left-8 right-4 flex justify-between">
                    <div className={`${skeletonBase} h-2 w-10`} />
                    <div className={`${skeletonBase} h-2 w-10`} />
                    <div className={`${skeletonBase} h-2 w-10`} />
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full animate-pulse px-3 pb-6 pt-3">
            <div
                className="absolute inset-x-3 bottom-6 top-3"
                style={{
                    background:
                        "linear-gradient(to top, rgba(var(--primary-five-rgb),0.08) 1px, transparent 1px), linear-gradient(to right, rgba(var(--primary-five-rgb),0.06) 1px, transparent 1px)",
                    backgroundSize: "100% 25%, 16.66% 100%",
                }}
            />
            <div className="absolute bottom-6 left-3 right-3 border-b border-[rgba(var(--primary-five-rgb),0.25)]" />
            <div className="absolute bottom-6 left-3 top-3 border-l border-[rgba(var(--primary-five-rgb),0.25)]" />
            <svg
                className="absolute inset-x-3 bottom-6 top-3 h-[calc(100%-2.25rem)] w-[calc(100%-1.5rem)]"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
                aria-hidden="true"
            >
                <path
                    d="M0 78 C12 74 18 62 28 64 C42 66 43 30 55 28 C67 26 68 58 78 55 C88 52 91 36 100 40"
                    fill="none"
                    stroke="rgba(var(--primary-five-rgb),0.22)"
                    strokeLinecap="round"
                    strokeWidth="4"
                />
                <path
                    d="M0 62 C14 58 21 48 32 50 C46 52 52 76 66 70 C78 65 84 48 100 52"
                    fill="none"
                    stroke="rgba(var(--primary-five-rgb),0.12)"
                    strokeLinecap="round"
                    strokeWidth="4"
                />
            </svg>
            <div className="absolute bottom-0 left-8 right-4 flex justify-between">
                <div className={`${skeletonBase} h-2 w-10`} />
                <div className={`${skeletonBase} h-2 w-10`} />
                <div className={`${skeletonBase} h-2 w-10`} />
            </div>
        </div>
    );
}
