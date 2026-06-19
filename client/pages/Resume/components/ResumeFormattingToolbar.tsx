import type React from "react";
import { motion } from "framer-motion";
import { ZOOM_STEP, clampZoom } from "../formatting";
import { PageStyleShelf } from "./PageStyleShelf";

type ResumeFormattingToolbarProps = {
    isLightMode: boolean;
    formatting: ReturnType<typeof import("../hooks/useResumeFormatting").useResumeFormatting>;
};

export const ResumeFormattingToolbar: React.FC<ResumeFormattingToolbarProps> = ({
    isLightMode,
    formatting
}) => (
    <div
        className="resume-toolbar-viewport print:hidden"
        style={formatting.bottomControlsViewportStyle}
    >
        <motion.div className="resume-toolbar resume-edit-control">
            <PageStyleShelf
                isPageStyleShelfOpen={formatting.isPageStyleShelfOpen}
                isPageStyleShelfCompact={formatting.isPageStyleShelfCompact}
                pageSize={formatting.pageSize}
                setPageSize={formatting.setPageSize}
                titleFontSize={formatting.titleFontSize}
                setTitleFontSize={formatting.setTitleFontSize}
                headerFontSize={formatting.headerFontSize}
                setHeaderFontSize={formatting.setHeaderFontSize}
                subHeaderFontSize={formatting.subHeaderFontSize}
                setSubHeaderFontSize={formatting.setSubHeaderFontSize}
                bodyFontSize={formatting.bodyFontSize}
                setBodyFontSize={formatting.setBodyFontSize}
                pageMarginPt={formatting.pageMarginPt}
                setPageMarginPt={formatting.setPageMarginPt}
                paperLayoutFormat={formatting.paperLayoutFormat}
                setPaperLayoutFormat={formatting.setPaperLayoutFormat}
                setFontPreviewTarget={formatting.setFontPreviewTarget}
                setIsMarginPreviewVisible={formatting.setIsMarginPreviewVisible}
                setIsPageFormatPreviewVisible={formatting.setIsPageFormatPreviewVisible}
                setGapPreviewTarget={formatting.setGapPreviewTarget}
            />
            {formatting.isPageStyleShelfOpen && (
                <div className={`h-px w-full shrink-0 ${isLightMode ? "bg-slate-300/80" : "bg-white/14"}`} />
            )}
            <div className="flex items-center gap-px px-1.5 py-0.5">
                <button
                    type="button"
                    onClick={formatting.handleTogglePageStyleShelf}
                    className="resume-tool-button"
                    data-active={formatting.isPageStyleShelfOpen}
                    title={formatting.isPageStyleShelfOpen ? "Close page style shelf" : "Open page style shelf"}
                    aria-label={formatting.isPageStyleShelfOpen ? "Close page style shelf" : "Open page style shelf"}
                    aria-pressed={formatting.isPageStyleShelfOpen}
                >
                    <svg className="resume-action-button__icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
                        <rect x="5" y="7" width="14" height="10" rx="2.4" />
                        <path strokeLinecap="round" d="M9 15h6" />
                    </svg>
                </button>
                <div className={`h-3.5 w-px ${isLightMode ? "bg-slate-300" : "bg-white/12"}`} />
                <button
                    type="button"
                    onClick={formatting.handleFitZoom}
                    className="resume-tool-button"
                    data-active={formatting.zoomMode === "fit"}
                    title="Fit page to available workspace"
                    aria-label="Fit page to available workspace"
                    aria-pressed={formatting.zoomMode === "fit"}
                >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l6 6M21 3l-6 6M3 21l6-6M21 21l-6-6" />
                    </svg>
                </button>
                <button
                    type="button"
                    onClick={() => {
                        formatting.setZoomMode("manual");
                        formatting.setManualZoom(1);
                    }}
                    className="resume-tool-button"
                    data-active={formatting.zoomMode === "manual" && formatting.manualZoom === 1}
                    title="Set zoom to 100%"
                    aria-label="Set zoom to 100%"
                >
                    <span className="text-[7px] font-medium leading-none tracking-normal">1:1</span>
                </button>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => {
                            formatting.setZoomMode("manual");
                            formatting.setManualZoom((value) => clampZoom(value - ZOOM_STEP));
                        }}
                        className="resume-tool-button"
                        title="Zoom out"
                        aria-label="Zoom out"
                    >
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        </svg>
                    </button>
                    <span className={`min-w-9 px-1 text-center text-[7px] font-medium ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                        {formatting.zoomPercent}%
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            formatting.setZoomMode("manual");
                            formatting.setManualZoom((value) => clampZoom(value + ZOOM_STEP));
                        }}
                        className="resume-tool-button"
                        title="Zoom in"
                        aria-label="Zoom in"
                    >
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                        </svg>
                    </button>
                </div>
            </div>
        </motion.div>
    </div>
);
