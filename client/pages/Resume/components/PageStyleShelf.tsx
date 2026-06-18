import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { FontPreviewTarget, PageSize, PaperLayoutFormat } from "../types";
import { PAPER_SIZES } from "../formatting";
import { ShelfMinusIcon, ShelfPlusIcon } from "./DocumentSection";

type PageStyleShelfProps = {
    isPageStyleShelfOpen: boolean;
    isPageStyleShelfCompact: boolean;
    pageSize: PageSize;
    setPageSize: React.Dispatch<React.SetStateAction<PageSize>>;
    titleFontSize: number;
    setTitleFontSize: React.Dispatch<React.SetStateAction<number>>;
    headerFontSize: number;
    setHeaderFontSize: React.Dispatch<React.SetStateAction<number>>;
    subHeaderFontSize: number;
    setSubHeaderFontSize: React.Dispatch<React.SetStateAction<number>>;
    bodyFontSize: number;
    setBodyFontSize: React.Dispatch<React.SetStateAction<number>>;
    pageMarginPt: number;
    setPageMarginPt: React.Dispatch<React.SetStateAction<number>>;
    paperLayoutFormat: PaperLayoutFormat;
    setPaperLayoutFormat: React.Dispatch<React.SetStateAction<PaperLayoutFormat>>;
    setFontPreviewTarget: React.Dispatch<React.SetStateAction<FontPreviewTarget | null>>;
    setIsMarginPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setIsPageFormatPreviewVisible: React.Dispatch<React.SetStateAction<boolean>>;
    setGapPreviewTarget: React.Dispatch<React.SetStateAction<"section" | "inner" | null>>;
};

export const PageStyleShelf: React.FC<PageStyleShelfProps> = (props) => {
    const {
        isPageStyleShelfOpen, isPageStyleShelfCompact,
        pageSize, setPageSize, titleFontSize, setTitleFontSize, headerFontSize, setHeaderFontSize, subHeaderFontSize, setSubHeaderFontSize, bodyFontSize, setBodyFontSize,
        pageMarginPt, setPageMarginPt, paperLayoutFormat, setPaperLayoutFormat, setFontPreviewTarget, setIsMarginPreviewVisible,
        setIsPageFormatPreviewVisible, setGapPreviewTarget
    } = props;
    const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    const controlLayoutTransition = { duration: 0.2, ease: [0.32, 0.72, 0.32, 1] as const };

    return (
                <AnimatePresence initial={false}>
                    {isPageStyleShelfOpen && (
                        <motion.div
                            className={`resume-page-style-shelf resume-edit-control flex w-fit max-w-full items-center overflow-hidden px-4 print:hidden ${
                                isPageStyleShelfCompact ? "is-compact" : ""
                            }`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: isPageStyleShelfCompact ? 142 : 88, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                        >
                            <div className="resume-page-style-shelf-layout flex h-[88px] w-max items-center gap-4 leading-none">
                                <div className="resume-page-style-shelf-left-controls contents">
                                <motion.div
                                    layout="position"
                                    transition={{ layout: controlLayoutTransition }}
                                    className="resume-page-style-shelf-control resume-page-style-shelf-title-size resume-shelf-stepper"
                                    onMouseEnter={() => setFontPreviewTarget("title")}
                                    onMouseLeave={() => setFontPreviewTarget(null)}
                                >
                                    <span className="resume-shelf-label">Title</span>
                                    <div className="resume-shelf-stepper__row">
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setTitleFontSize((value) => clampNumber(value - 1, 18, 34))} disabled={titleFontSize <= 18} aria-label="Decrease title font size"><ShelfMinusIcon /></button>
                                        <span className="resume-shelf-stepper__value">{titleFontSize}pt</span>
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setTitleFontSize((value) => clampNumber(value + 1, 18, 34))} disabled={titleFontSize >= 34} aria-label="Increase title font size"><ShelfPlusIcon /></button>
                                    </div>
                                </motion.div>
                                <motion.div
                                    layout="position"
                                    transition={{ layout: controlLayoutTransition }}
                                    className="resume-page-style-shelf-control resume-page-style-shelf-header-size resume-shelf-stepper"
                                    onMouseEnter={() => setFontPreviewTarget("header")}
                                    onMouseLeave={() => setFontPreviewTarget(null)}
                                >
                                    <span className="resume-shelf-label">Header</span>
                                    <div className="resume-shelf-stepper__row">
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setHeaderFontSize((value) => clampNumber(value - 1, 12, 22))} disabled={headerFontSize <= 12} aria-label="Decrease header font size"><ShelfMinusIcon /></button>
                                        <span className="resume-shelf-stepper__value">{headerFontSize}pt</span>
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setHeaderFontSize((value) => clampNumber(value + 1, 12, 22))} disabled={headerFontSize >= 22} aria-label="Increase header font size"><ShelfPlusIcon /></button>
                                    </div>
                                </motion.div>
                                <motion.div
                                    layout="position"
                                    transition={{ layout: controlLayoutTransition }}
                                    className="resume-page-style-shelf-control resume-page-style-shelf-subheader-size resume-shelf-stepper"
                                    onMouseEnter={() => setFontPreviewTarget("subheader")}
                                    onMouseLeave={() => setFontPreviewTarget(null)}
                                >
                                    <span className="resume-shelf-label">Sub Header</span>
                                    <div className="resume-shelf-stepper__row">
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setSubHeaderFontSize((value) => clampNumber(value - 1, 10, 20))} disabled={subHeaderFontSize <= 10} aria-label="Decrease sub header font size"><ShelfMinusIcon /></button>
                                        <span className="resume-shelf-stepper__value">{subHeaderFontSize}pt</span>
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setSubHeaderFontSize((value) => clampNumber(value + 1, 10, 20))} disabled={subHeaderFontSize >= 20} aria-label="Increase sub header font size"><ShelfPlusIcon /></button>
                                    </div>
                                </motion.div>
                                <motion.div
                                    layout="position"
                                    transition={{ layout: controlLayoutTransition }}
                                    className="resume-page-style-shelf-control resume-page-style-shelf-body-size resume-shelf-stepper"
                                    onMouseEnter={() => setFontPreviewTarget("body")}
                                    onMouseLeave={() => setFontPreviewTarget(null)}
                                >
                                    <span className="resume-shelf-label">Body</span>
                                    <div className="resume-shelf-stepper__row">
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setBodyFontSize((value) => clampNumber(value - 0.5, 9, 15))} disabled={bodyFontSize <= 9} aria-label="Decrease body font size"><ShelfMinusIcon /></button>
                                        <span className="resume-shelf-stepper__value">{bodyFontSize}pt</span>
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setBodyFontSize((value) => clampNumber(value + 0.5, 9, 15))} disabled={bodyFontSize >= 15} aria-label="Increase body font size"><ShelfPlusIcon /></button>
                                    </div>
                                </motion.div>
                                </div>
                                <div className="resume-page-style-shelf-right-controls contents">
                                <motion.div
                                    layout="position"
                                    transition={{ layout: controlLayoutTransition }}
                                    className="resume-page-style-shelf-control resume-page-style-shelf-margins resume-shelf-stepper"
                                    onMouseEnter={() => setIsMarginPreviewVisible(true)}
                                    onMouseLeave={() => setIsMarginPreviewVisible(false)}
                                >
                                    <span className="resume-shelf-label">Margins</span>
                                    <div className="resume-shelf-stepper__row">
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setPageMarginPt((value) => clampNumber(value - 2, 24, 72))} disabled={pageMarginPt <= 24} aria-label="Decrease page margins"><ShelfMinusIcon /></button>
                                        <span className="resume-shelf-stepper__value">{pageMarginPt}pt</span>
                                        <button type="button" className="resume-shelf-stepper__button" onClick={() => setPageMarginPt((value) => clampNumber(value + 2, 24, 72))} disabled={pageMarginPt >= 72} aria-label="Increase page margins"><ShelfPlusIcon /></button>
                                    </div>
                                </motion.div>
                                <motion.div
                                    layout="position"
                                    transition={{ layout: controlLayoutTransition }}
                                    className="resume-page-style-shelf-control resume-page-style-shelf-page-format resume-shelf-stepper"
                                    onMouseEnter={() => setIsPageFormatPreviewVisible(true)}
                                    onMouseLeave={() => setIsPageFormatPreviewVisible(false)}
                                >
                                    <span className="resume-shelf-label">Page Format</span>
                                    <div className="resume-shelf-segments" role="group" aria-label="Page size">
                                        {(["a4", "letter"] as PageSize[]).map((size) => (
                                            <button
                                                key={size}
                                                type="button"
                                                onClick={() => setPageSize(size)}
                                                className="resume-shelf-segment"
                                                data-selected={pageSize === size}
                                                title={`Use ${PAPER_SIZES[size].standardLabel} page size`}
                                                aria-label={`Use ${PAPER_SIZES[size].standardLabel} page size`}
                                                aria-pressed={pageSize === size}
                                            >
                                                {size === "a4" ? "A4" : "Letter"}
                                                {pageSize === size && (
                                                    <motion.span
                                                        layoutId="page-size-shelf-indicator"
                                                        className="resume-shelf-segment__indicator"
                                                        transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                                <motion.div
                                    layout="position"
                                    transition={{ layout: controlLayoutTransition }}
                                    className="resume-page-style-shelf-control resume-page-style-shelf-section-gap resume-shelf-stepper"
                                    onMouseEnter={() => setGapPreviewTarget("section")}
                                    onMouseLeave={() => setGapPreviewTarget(null)}
                                >
                                    <span className="resume-shelf-label">Spacing</span>
                                    <div className="resume-shelf-segments" role="group" aria-label="Document spacing">
                                        {(["compact", "standard", "relaxed"] as PaperLayoutFormat[]).map((format) => (
                                            <button
                                                key={format}
                                                type="button"
                                                onClick={() => setPaperLayoutFormat(format)}
                                                className="resume-shelf-segment"
                                                data-selected={paperLayoutFormat === format}
                                                title={`${format[0].toUpperCase()}${format.slice(1)} document spacing`}
                                                aria-label={`${format[0].toUpperCase()}${format.slice(1)} document spacing`}
                                                aria-pressed={paperLayoutFormat === format}
                                            >
                                                {format[0].toUpperCase()}{format.slice(1)}
                                                {paperLayoutFormat === format && (
                                                    <motion.span
                                                        layoutId="section-gap-shelf-indicator"
                                                        className="resume-shelf-segment__indicator"
                                                        transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                                                    />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

    );
};
