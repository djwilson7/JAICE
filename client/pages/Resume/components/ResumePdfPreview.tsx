import React from "react";

type ResumePdfPreviewProps = {
    isLightMode: boolean;
    pdfPreviewUrl: string | null;
    pdfPreviewFilename: string;
    isGeneratingPdfPreview: boolean;
    canDownloadPdfPreview: boolean;
    headerActionButtonClass: string;
    headerActionIconClass: string;
    onBackToEdit: () => void;
    onDownload: () => void;
    onRefresh: () => void | Promise<void>;
};

export const ResumePdfPreview: React.FC<ResumePdfPreviewProps> = ({
    isLightMode,
    pdfPreviewUrl,
    pdfPreviewFilename,
    isGeneratingPdfPreview,
    canDownloadPdfPreview,
    headerActionButtonClass,
    headerActionIconClass,
    onBackToEdit,
    onDownload,
    onRefresh
}) => (
    <div className="min-h-0 flex-1 overflow-hidden px-8 py-6 print:hidden">
        <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-md border border-white/70 bg-white shadow-[0_26px_70px_rgba(0,0,0,0.36)]">
            <div className={`flex shrink-0 items-center justify-between border-b px-4 py-2 ${isLightMode ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950"}`}>
                <div className="min-w-0">
                    <div className={`truncate text-xs font-semibold ${isLightMode ? "text-slate-900" : "text-slate-100"}`}>
                        PDF Preview
                    </div>
                    <div className={`truncate text-[10px] ${isLightMode ? "text-slate-500" : "text-slate-400"}`}>
                        {pdfPreviewFilename}
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isGeneratingPdfPreview}
                        className={`${headerActionButtonClass} ${isLightMode ? "text-slate-600 hover:text-slate-950" : "text-slate-400 hover:text-slate-100"}`}
                        title="Regenerate PDF preview"
                        aria-label="Regenerate PDF preview"
                    >
                        <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={!canDownloadPdfPreview || isGeneratingPdfPreview}
                        className={`${headerActionButtonClass} ${isLightMode ? "text-sky-700 hover:text-sky-950" : "text-sky-300 hover:text-sky-100"} disabled:opacity-50`}
                        title="Continue download"
                        aria-label="Continue download"
                    >
                        <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={onBackToEdit}
                        className={`${headerActionButtonClass} ${isLightMode ? "text-slate-600 hover:text-slate-950" : "text-slate-400 hover:text-slate-100"}`}
                        title="Back to editing"
                        aria-label="Back to editing"
                    >
                        <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6 9 12l6 6" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className={`relative min-h-0 flex-1 ${isLightMode ? "bg-slate-200" : "bg-slate-900"}`}>
                {isGeneratingPdfPreview && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/35">
                        <div className="rounded-md border border-white/20 bg-slate-950/80 px-4 py-3 text-xs font-medium text-white shadow-xl">
                            Generating PDF preview...
                        </div>
                    </div>
                )}
                {pdfPreviewUrl ? (
                    <object
                        data={pdfPreviewUrl}
                        type="application/pdf"
                        className="h-full w-full"
                        aria-label="Resume PDF preview"
                    >
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                            <p className={`max-w-md text-sm ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                                This browser cannot display the PDF inline. Continue the download to view the generated file.
                            </p>
                            <button
                                type="button"
                                onClick={onDownload}
                                className={`${headerActionButtonClass} ${isLightMode ? "text-sky-700" : "text-sky-300"}`}
                            >
                                Download PDF
                            </button>
                        </div>
                    </object>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                        <p className={`max-w-md text-sm ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                            Generate a PDF preview to inspect the exact file before downloading.
                        </p>
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={isGeneratingPdfPreview}
                            className={`${headerActionButtonClass} ${isLightMode ? "text-sky-700" : "text-sky-300"}`}
                        >
                            Generate Preview
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
);
