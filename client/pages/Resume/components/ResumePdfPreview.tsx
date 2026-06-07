import React from "react";

type ResumePdfPreviewProps = {
    isLightMode: boolean;
    pdfPreviewUrl: string | null;
    documentTitle: string;
    isGeneratingPdfPreview: boolean;
    viewportStyle: React.CSSProperties;
    headerActionButtonClass: string;
    headerActionIconClass: string;
    onBackToEdit: () => void;
};

export const ResumePdfPreview: React.FC<ResumePdfPreviewProps> = ({
    isLightMode,
    pdfPreviewUrl,
    documentTitle,
    isGeneratingPdfPreview,
    viewportStyle,
    headerActionButtonClass,
    headerActionIconClass,
    onBackToEdit
}) => (
    <div
        className="absolute inset-0 min-h-0 overflow-hidden print:hidden transition-[padding] duration-300"
        style={viewportStyle}
    >
        <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-md border border-white/70 bg-white shadow-[0_26px_70px_rgba(0,0,0,0.36)]">
            <div className={`grid h-12 shrink-0 grid-cols-[1fr_minmax(0,2fr)_1fr] items-center border-b px-3 ${isLightMode ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950"}`}>
                <div className="flex justify-start">
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
                <div className={`truncate px-3 text-center text-xs font-semibold ${isLightMode ? "text-slate-900" : "text-slate-100"}`}>
                    {documentTitle || "Unnamed Resume"}
                </div>
                <div className={`justify-self-end text-[10px] font-semibold uppercase ${isLightMode ? "text-slate-500" : "text-slate-400"}`}>
                    PDF Preview
                </div>
            </div>
            <div className={`relative min-h-0 flex-1 ${isLightMode ? "bg-slate-200" : "bg-slate-900"}`}>
                {isGeneratingPdfPreview || !pdfPreviewUrl ? (
                    <div className="flex h-full items-start justify-center overflow-hidden p-6">
                        <div className="aspect-[8.5/11] h-full max-h-full max-w-full animate-pulse overflow-hidden rounded-sm border border-slate-300 bg-white p-[9%] shadow-[0_18px_44px_rgba(15,23,42,0.2)]">
                            <div className="mx-auto mb-[7%] h-3 w-2/5 rounded-sm bg-slate-300" />
                            <div className="mx-auto mb-[10%] h-2 w-3/5 rounded-sm bg-slate-200" />
                            <div className="mb-[4%] h-2.5 w-1/3 rounded-sm bg-slate-300" />
                            <div className="space-y-2">
                                <div className="h-2 w-full rounded-sm bg-slate-200" />
                                <div className="h-2 w-11/12 rounded-sm bg-slate-200" />
                                <div className="h-2 w-4/5 rounded-sm bg-slate-200" />
                            </div>
                            <div className="mb-[4%] mt-[10%] h-2.5 w-2/5 rounded-sm bg-slate-300" />
                            <div className="space-y-2">
                                <div className="h-2 w-3/4 rounded-sm bg-slate-200" />
                                <div className="h-2 w-full rounded-sm bg-slate-200" />
                                <div className="h-2 w-11/12 rounded-sm bg-slate-200" />
                                <div className="h-2 w-4/5 rounded-sm bg-slate-200" />
                            </div>
                            <div className="mb-[4%] mt-[10%] h-2.5 w-1/3 rounded-sm bg-slate-300" />
                            <div className="space-y-2">
                                <div className="h-2 w-full rounded-sm bg-slate-200" />
                                <div className="h-2 w-5/6 rounded-sm bg-slate-200" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <object
                        data={pdfPreviewUrl}
                        type="application/pdf"
                        className="h-full w-full"
                        aria-label="Resume PDF preview"
                    >
                        <div className="flex h-full items-center justify-center p-6 text-center">
                            <p className={`max-w-md text-sm ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>
                                This browser cannot display the generated PDF preview inline.
                            </p>
                        </div>
                    </object>
                )}
            </div>
        </div>
    </div>
);
