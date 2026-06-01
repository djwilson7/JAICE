import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FontPreviewTarget, PageSize, PaperLayoutFormat } from "../types";
import { PAPER_SIZES } from "../formatting";
import { ShelfMinusIcon, ShelfPlusIcon } from "./DocumentSection";

type PageStyleShelfProps = {
    isLightMode: boolean;
    isPageStyleShelfOpen: boolean;
    isPageStyleShelfCompact: boolean;
    shelfSurfaceStyle: React.CSSProperties;
    shelfSectionClass: string;
    shelfSectionTitleClass: string;
    shelfControlLabelClass: string;
    shelfDividerClass: string;
    shelfSegmentGroupClass: string;
    shelfSegmentButtonClass: string;
    shelfSegmentIndicatorClass: string;
    shelfStepperControlClass: string;
    shelfStepperLabelClass: string;
    shelfStepperRowClass: string;
    shelfStepperButtonClass: string;
    shelfStepperValueClass: string;
    pageSize: PageSize;
    setPageSize: React.Dispatch<React.SetStateAction<PageSize>>;
    titleFontSize: number;
    setTitleFontSize: React.Dispatch<React.SetStateAction<number>>;
    headerFontSize: number;
    setHeaderFontSize: React.Dispatch<React.SetStateAction<number>>;
    bodyFontSize: number;
    setBodyFontSize: React.Dispatch<React.SetStateAction<number>>;
    pageMarginPt: number;
    setPageMarginPt: React.Dispatch<React.SetStateAction<number>>;
    paperLayoutFormat: PaperLayoutFormat;
    setPaperLayoutFormat: React.Dispatch<React.SetStateAction<PaperLayoutFormat>>;
    setFontPreviewTarget: React.Dispatch<React.SetStateAction<FontPreviewTarget | null>>;
    setIsMarginPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPageFormatPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSectionGapPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PageStyleShelf: React.FC<PageStyleShelfProps> = (props) => {
    const {
        isLightMode, isPageStyleShelfOpen, isPageStyleShelfCompact, shelfSurfaceStyle, shelfSectionClass, shelfSectionTitleClass,
        shelfControlLabelClass, shelfDividerClass, shelfSegmentGroupClass, shelfSegmentButtonClass, shelfSegmentIndicatorClass,
        shelfStepperControlClass, shelfStepperLabelClass, shelfStepperRowClass, shelfStepperButtonClass, shelfStepperValueClass,
        pageSize, setPageSize, titleFontSize, setTitleFontSize, headerFontSize, setHeaderFontSize, bodyFontSize, setBodyFontSize,
        pageMarginPt, setPageMarginPt, paperLayoutFormat, setPaperLayoutFormat, setFontPreviewTarget, setIsMarginPreviewVisible,
        setIsPageFormatPreviewVisible, setIsSectionGapPreviewVisible
    } = props;
    const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    return (
                <AnimatePresence>
                    {isPageStyleShelfOpen && (
                        <motion.div
                            className={`resume-page-style-shelf resume-edit-control absolute bottom-16 left-1/2 z-20 flex h-[88px] w-fit max-w-[calc(100%-3rem)] -translate-x-1/2 items-center rounded-md border px-4 py-0 print:hidden ${
                                isLightMode
                                    ? "border-slate-300/80 bg-white/82 shadow-[0_10px_24px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.86)]"
                                    : "border-white/14 bg-slate-950/72 shadow-[0_10px_24px_rgba(2,6,23,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]"
                            } ${isPageStyleShelfCompact ? "is-compact" : ""}`}
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 18, opacity: 0 }}
                            transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                            style={shelfSurfaceStyle}
                        >
                            <div className="resume-page-style-shelf-layout flex h-full w-max items-stretch gap-4 leading-none">
                                <div
                                    className={`resume-page-style-shelf-section resume-page-style-shelf-page-format ${shelfSectionClass} shrink-0`}
                                    onMouseEnter={() => setIsPageFormatPreviewVisible(true)}
                                    onMouseLeave={() => setIsPageFormatPreviewVisible(false)}
                                >
                                    <div className={shelfSectionTitleClass}>Page Format</div>
                                    <div className="flex w-fit flex-col items-center gap-1.5">
                                        <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>{PAPER_SIZES[pageSize].standardLabel}</span>
                                        <div className={shelfSegmentGroupClass} role="group" aria-label="Page size">
                                            {(["a4", "letter"] as PageSize[]).map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => setPageSize(size)}
                                                    className={`${shelfSegmentButtonClass} ${pageSize === size ? isLightMode ? "!text-sky-700" : "!text-sky-100" : ""}`}
                                                    title={`Use ${PAPER_SIZES[size].standardLabel} page size`}
                                                    aria-label={`Use ${PAPER_SIZES[size].standardLabel} page size`}
                                                    aria-pressed={pageSize === size}
                                                >
                                                    {size === "a4" ? "A4" : "Letter"}
                                                    {pageSize === size && (
                                                        <motion.span
                                                            layoutId="page-size-shelf-indicator"
                                                            className={shelfSegmentIndicatorClass}
                                                            transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={`resume-page-style-shelf-divider ${shelfDividerClass}`} />
                                <div className={`resume-page-style-shelf-section resume-page-style-shelf-font ${shelfSectionClass} min-w-0 flex-1 items-center px-2`}>
                                    <div className={`${shelfSectionTitleClass} self-center text-center`}>Font Size</div>
                                    <div className="resume-page-style-shelf-font-controls grid grid-cols-3 justify-center gap-x-3">
                                        <div
                                            className={`resume-page-style-shelf-title-size ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setFontPreviewTarget("title")}
                                            onMouseLeave={() => setFontPreviewTarget(null)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Title</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setTitleFontSize((value) => clampNumber(value - 1, 18, 34))} disabled={titleFontSize <= 18} aria-label="Decrease title font size"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{titleFontSize}</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setTitleFontSize((value) => clampNumber(value + 1, 18, 34))} disabled={titleFontSize >= 34} aria-label="Increase title font size"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                        <div
                                            className={`resume-page-style-shelf-header-size ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setFontPreviewTarget("header")}
                                            onMouseLeave={() => setFontPreviewTarget(null)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Header</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setHeaderFontSize((value) => clampNumber(value - 1, 12, 22))} disabled={headerFontSize <= 12} aria-label="Decrease header font size"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{headerFontSize}</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setHeaderFontSize((value) => clampNumber(value + 1, 12, 22))} disabled={headerFontSize >= 22} aria-label="Increase header font size"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                        <div
                                            className={`resume-page-style-shelf-body-size ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setFontPreviewTarget("body")}
                                            onMouseLeave={() => setFontPreviewTarget(null)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Body</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setBodyFontSize((value) => clampNumber(value - 0.5, 9, 15))} disabled={bodyFontSize <= 9} aria-label="Decrease body font size"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{bodyFontSize}</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setBodyFontSize((value) => clampNumber(value + 0.5, 9, 15))} disabled={bodyFontSize >= 15} aria-label="Increase body font size"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`resume-page-style-shelf-divider ${shelfDividerClass}`} />
                                <div className={`resume-page-style-shelf-section resume-page-style-shelf-spacing ${shelfSectionClass} shrink-0`}>
                                    <div className={shelfSectionTitleClass}>Spacing</div>
                                    <div className="resume-page-style-shelf-spacing-controls flex w-fit items-start gap-4">
                                        <div
                                            className={`resume-page-style-shelf-margins ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setIsMarginPreviewVisible(true)}
                                            onMouseLeave={() => setIsMarginPreviewVisible(false)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Margins</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setPageMarginPt((value) => clampNumber(value - 2, 24, 60))} disabled={pageMarginPt <= 24} aria-label="Decrease page margins"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{pageMarginPt}pt</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setPageMarginPt((value) => clampNumber(value + 2, 24, 60))} disabled={pageMarginPt >= 60} aria-label="Increase page margins"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                        <div
                                            className={`resume-page-style-shelf-section-gap ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setIsSectionGapPreviewVisible(true)}
                                            onMouseLeave={() => setIsSectionGapPreviewVisible(false)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Section Gap</span>
                                            <div className={shelfSegmentGroupClass} role="group" aria-label="Section gap">
                                                {(["compact", "standard", "relaxed"] as PaperLayoutFormat[]).map((format) => (
                                                    <button
                                                        key={format}
                                                        type="button"
                                                        onClick={() => setPaperLayoutFormat(format)}
                                                        className={`${shelfSegmentButtonClass} ${paperLayoutFormat === format ? isLightMode ? "!text-sky-700" : "!text-sky-100" : ""}`}
                                                        title={`${format[0].toUpperCase()}${format.slice(1)} layout spacing`}
                                                        aria-label={`${format[0].toUpperCase()}${format.slice(1)} layout spacing`}
                                                        aria-pressed={paperLayoutFormat === format}
                                                    >
                                                        {format[0].toUpperCase()}{format.slice(1)}
                                                        {paperLayoutFormat === format && (
                                                            <motion.span
                                                                layoutId="section-gap-shelf-indicator"
                                                                className={shelfSegmentIndicatorClass}
                                                                transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

    );
};
