import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTextStats } from "../resumeData";
import { AutoResizeTextarea } from "./AutoResizeTextarea";

export type OverlayInputProps = {
    path: string;
    label: string;
    value: string;
    placeholder: string;
    className: string;
    style?: React.CSSProperties;
    onChange: (val: string) => void;
    onDelete?: () => void;
    onCustomAction?: () => void;
    customActionTitle?: string;
    customActionIcon?: React.ReactNode;
    isAutoResize?: boolean;
    showTextStats?: boolean;
    customActionPlacement?: "tray" | "left" | "right";
    disableClear?: boolean;
    disableDelete?: boolean;
    containerClassName?: string;
    inputContainerClassName?: string;
    hoveredField: string | null;
    setHoveredField: React.Dispatch<React.SetStateAction<string | null>>;
    focusedField: string | null;
    setFocusedField: React.Dispatch<React.SetStateAction<string | null>>;
};

export const OverlayInput: React.FC<OverlayInputProps> = ({
    path,
    value,
    placeholder,
    className,
    style,
    onChange,
    onDelete,
    onCustomAction,
    customActionTitle,
    customActionIcon,
    isAutoResize,
    showTextStats: shouldShowTextStats = false,
    customActionPlacement = "tray",
    disableClear = false,
    disableDelete = false,
    containerClassName = "",
    inputContainerClassName = "",
    hoveredField,
    setHoveredField,
    focusedField,
    setFocusedField
}) => {
    const isOpen = hoveredField === path || focusedField === path;
    const fluidEase = [0.32, 0.72, 0.32, 1] as [number, number, number, number];
    const [isClearHovered, setIsClearHovered] = useState(false);
    const [isDeleteHovered, setIsDeleteHovered] = useState(false);
    
    const InputComp = (isAutoResize ? AutoResizeTextarea : "input") as React.ElementType;
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const showInlineClear = isOpen && Boolean(value) && !disableClear;
    const showInlineDelete = isOpen && Boolean(onDelete) && !disableDelete;
    const showLeftCustomAction = isOpen && customActionPlacement === "left" && Boolean(onCustomAction && customActionIcon);
    const showRightCustomAction = isOpen && customActionPlacement === "right" && Boolean(onCustomAction && customActionIcon);
    const showTextStats = shouldShowTextStats && hoveredField === path;
    const textStats = showTextStats ? getTextStats(value) : null;
    const buttonsActive = showRightCustomAction || showInlineClear || showInlineDelete;
    let buttonsEnd = 0;
    if (showInlineDelete) {
        buttonsEnd = (showRightCustomAction ? 24 : 0) + (showInlineClear ? 24 : 4) + 16;
    } else if (showInlineClear) {
        buttonsEnd = (showRightCustomAction ? 24 : 4) + 16;
    } else if (showRightCustomAction) {
        buttonsEnd = 4 + 16;
    }
    const overlayRightPad = isOpen ? (buttonsActive ? buttonsEnd + 8 : 2) : 0;

    useEffect(() => {
        if (focusedField === path && inputRef.current && document.activeElement !== inputRef.current) {
            inputRef.current.focus();
            if ('selectionStart' in inputRef.current) {
                const len = value.length;
                inputRef.current.selectionStart = len;
                inputRef.current.selectionEnd = len;
            }
        }
    }, [focusedField, path, value]);
    
    return (
        <motion.div
            className={`overlay-meta-field relative flex flex-col items-stretch ${containerClassName}`}
            data-open={isOpen}
            onHoverStart={() => setHoveredField(path)}
            onHoverEnd={() => setHoveredField(current => current === path ? null : current)}
            animate={{
                paddingTop: isOpen ? 2 : 0,
                paddingRight: overlayRightPad,
                paddingBottom: isOpen ? 1 : 0,
                paddingLeft: isOpen ? (showLeftCustomAction ? 30 : 2) : 0,
                marginTop: isOpen ? -2 : 0,
                marginRight: -overlayRightPad,
                marginBottom: isOpen ? -1 : 0,
                marginLeft: isOpen ? (showLeftCustomAction ? -30 : -2) : 0,
                backgroundColor: isOpen ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 255, 255, 0)",
                borderTopLeftRadius: isOpen ? 5 : 4,
                borderTopRightRadius: isOpen ? 5 : 4,
                borderBottomLeftRadius: isOpen ? 5 : 4,
                borderBottomRightRadius: isOpen ? 5 : 4,
                boxShadow: isOpen
                    ? isDeleteHovered
                        ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #dc2626"
                        : "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(14, 165, 233, 0.35)"
                    : "0 0px 0px rgba(0,0,0,0), 0 0 0 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.28, ease: fluidEase }}
            style={{
                transformOrigin: "center",
                zIndex: isOpen ? 80 : 0,
                backdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none",
                WebkitBackdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none"
            }}
        >
            <div className={`relative flex min-w-0 items-center ${inputContainerClassName}`}>
                {showLeftCustomAction && (
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onCustomAction}
                        className="resume-edit-control absolute right-full top-1/2 z-10 mr-1 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-black opacity-75 shadow-none transition-[background,color,opacity] hover:!bg-black/10 hover:text-black hover:opacity-100"
                        title={customActionTitle}
                        aria-label={customActionTitle}
                    >
                        {customActionIcon}
                    </button>
                )}
                <InputComp
                    ref={inputRef}
                    className={`${className} overlay-item-input resume-body-font-target`}
                    value={value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value)}
                    onFocus={() => setFocusedField(path)}
                    onBlur={() => setFocusedField(current => current === path ? null : current)}
                    placeholder={placeholder}
                    style={{
                        ...style,
                        color: isOpen ? (isDeleteHovered ? "#dc2626" : isClearHovered ? "#94a3b8" : "black") : style?.color,
                        opacity: isClearHovered ? 0.55 : style?.opacity,
                        textDecoration: isDeleteHovered ? "line-through" : isClearHovered ? "line-through" : style?.textDecoration,
                        textDecorationColor: isDeleteHovered ? "#dc2626" : isClearHovered ? "#94a3b8" : style?.textDecorationColor,
                        borderRadius: isOpen ? 4 : undefined,
                        transition: "color 150ms ease, opacity 150ms ease, text-decoration 150ms ease, text-decoration-color 150ms ease"
                    }}
                />
                {(showRightCustomAction || showInlineClear || showInlineDelete) && (
                    <div
                        className="pointer-events-none absolute left-full top-1/2 z-10 h-4 w-px -translate-y-1/2 bg-black/15"
                        style={{ marginLeft: -1 }}
                    />
                )}
                {showRightCustomAction && (
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onCustomAction}
                        className="resume-edit-control absolute left-full top-1/2 z-10 ml-1 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-black opacity-75 shadow-none transition-[background,color,opacity] hover:!bg-black/10 hover:text-black hover:opacity-100"
                        title={customActionTitle}
                        aria-label={customActionTitle}
                    >
                        {customActionIcon}
                    </button>
                )}
                {showInlineClear && (
                    <button
                        type="button"
                        onMouseEnter={() => setIsClearHovered(true)}
                        onMouseLeave={() => setIsClearHovered(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onChange("")}
                        className="resume-edit-control absolute left-full top-1/2 z-10 ml-1 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-black opacity-70 shadow-none transition-[background,color,opacity] hover:!bg-black/10 hover:text-black hover:opacity-100"
                        style={{ marginLeft: showRightCustomAction ? 24 : 4 }}
                        title="Clear field"
                        aria-label="Clear field"
                    >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                {showInlineDelete && (
                    <button
                        type="button"
                        onMouseEnter={() => setIsDeleteHovered(true)}
                        onMouseLeave={() => setIsDeleteHovered(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onDelete}
                        className="resume-edit-control absolute left-full top-1/2 z-10 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-[#f87171] opacity-80 shadow-none transition-[background,color,opacity] hover:!bg-red-500/15 hover:text-[#f87171] hover:opacity-100"
                        style={{ marginLeft: (showRightCustomAction ? 24 : 0) + (showInlineClear ? 24 : 4) }}
                        title="Delete"
                        aria-label="Delete field"
                    >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2.75" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                        </svg>
                    </button>
                )}
            </div>
            {showTextStats && textStats && (
                <div
                    className="resume-text-stat-pill pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-200 shadow-[0_10px_24px_rgba(2,6,23,0.30),inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                    {textStats.chars} chars • {textStats.words} words
                </div>
            )}
            <AnimatePresence initial={false}>
                {isOpen && customActionPlacement === "tray" && onCustomAction && (
                    <motion.div
                        key="tray"
                        className="overlay-trash-tray resume-edit-control absolute left-1/2 w-max -translate-x-1/2"
                        style={{
                            top: "100%",
                            zIndex: 90,
                            background: "rgba(255, 255, 255, 0.94)",
                            borderTop: "0",
                            borderLeft: "0",
                            borderRight: "0",
                            borderBottom: "0",
                            borderRadius: "0 0 12px 12px",
                            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(14, 165, 233, 0.35)",
                            transformOrigin: "top center",
                            backdropFilter: "blur(22px) saturate(160%)",
                            WebkitBackdropFilter: "blur(22px) saturate(160%)"
                        }}
                        initial={{ opacity: 0, y: -8, scaleY: 0.94 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -8, scaleY: 0.94 }}
                        transition={{ duration: 0.28, ease: fluidEase }}
                    >
                        <div className="flex items-center justify-end gap-1 px-1.5 py-0.5 text-xs text-slate-700 font-medium h-6">
                            {onCustomAction && customActionIcon && (
                                <button
                                    type="button"
                                    onClick={onCustomAction}
                                    className="!inline-flex !h-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 opacity-75 transition-[background,border-color,color,opacity,transform] duration-200 active:scale-95 hover:!bg-slate-500/10 hover:!border-slate-400/20 hover:opacity-100 cursor-pointer"
                                    style={{ color: "#475569" }}
                                    title={customActionTitle}
                                >
                                    {customActionIcon}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
