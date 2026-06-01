import React from "react";

type ResumeHeaderProps = {
    isLightMode: boolean;
    headerShellStyle: React.CSSProperties;
    headerActionButtonClass: string;
    headerActionIconClass: string;
    isLeftRailCollapsed: boolean;
    setIsLeftRailCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    isRightRailCollapsed: boolean;
    setIsRightRailCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    isMaster: boolean;
    setIsMaster: React.Dispatch<React.SetStateAction<boolean>>;
    resumeName: string;
    setResumeName: React.Dispatch<React.SetStateAction<string>>;
    isDirty: boolean;
    setIsDirty: React.Dispatch<React.SetStateAction<boolean>>;
    activeResumeId: string | null;
    isDraft: boolean;
    loadingSave: boolean;
    isPdfPreviewOpen: boolean;
    isGeneratingPdfPreview: boolean;
    handleSaveResume: () => void | Promise<void>;
    togglePdfPreview: () => void | Promise<void>;
    openPdfPreview: () => void | Promise<void>;
};

export const ResumeHeader: React.FC<ResumeHeaderProps> = ({
    isLightMode, headerShellStyle, headerActionButtonClass, headerActionIconClass,
    isLeftRailCollapsed, setIsLeftRailCollapsed, isRightRailCollapsed, setIsRightRailCollapsed,
    isMaster, setIsMaster, resumeName, setResumeName, isDirty, setIsDirty, activeResumeId, isDraft,
    loadingSave, isPdfPreviewOpen, isGeneratingPdfPreview, handleSaveResume, togglePdfPreview, openPdfPreview
}) => (
            <header 
                className={`border-b px-6 py-2.5 flex flex-col items-stretch gap-1 print:hidden shrink-0 z-20 ${
                    isLightMode ? "shadow-[0_12px_34px_rgba(15,23,42,0.12)]" : "shadow-[0_16px_45px_rgba(0,0,0,0.24)]"
                }`}
                style={headerShellStyle}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => setIsLeftRailCollapsed((value) => !value)}
                            className={`${headerActionButtonClass} ${
                                isLeftRailCollapsed
                                    ? isLightMode ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-slate-100"
                                    : isLightMode ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100"
                            }`}
                            title={isLeftRailCollapsed ? "Open resume drawer" : "Close resume drawer"}
                            aria-label={isLeftRailCollapsed ? "Open resume drawer" : "Close resume drawer"}
                            aria-pressed={!isLeftRailCollapsed}
                        >
                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4" y="4.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2 group/title min-w-0 flex-1">
                            {isMaster ? (
                                <svg className="h-4 w-4 shrink-0 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className={`h-4 w-4 shrink-0 ${isLightMode ? "text-sky-700" : "text-sky-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            <input
                                className={`text-sm font-bold bg-transparent border-b border-transparent outline-none px-1 py-0.5 rounded transition-[width,border-color,background,color] tracking-wide ${
                                    isLightMode
                                        ? "text-slate-900 hover:border-slate-300 focus:border-sky-600 focus:bg-white/70"
                                        : "text-slate-100 hover:border-slate-700 focus:border-sky-500 focus:bg-slate-950/20"
                                }`}
                                style={{
                                    width: `${Math.max((resumeName || "Unnamed Resume").length + 1, "Primary Resume".length)}ch`,
                                    maxWidth: "100%"
                                }}
                                value={resumeName}
                                onChange={(e) => {
                                    setResumeName(e.target.value);
                                    setIsDirty(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                    }
                                }}
                                placeholder="Unnamed Resume"
                                title="Rename resume. Save to persist the title."
                            />
                            <span className="opacity-0 group-hover/title:opacity-100 text-slate-500 transition-opacity pointer-events-none">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => {
                                setIsMaster(!isMaster);
                                setIsDirty(true);
                            }}
                            className={`${headerActionButtonClass} ${
                                isMaster
                                    ? "text-amber-400 hover:text-amber-300"
                                    : "text-slate-500 hover:text-amber-400"
                            }`}
                            title={isMaster ? "Active Master Profile (Click to unset)" : "Set as Master Profile"}
                        >
                            {isMaster ? (
                                <svg className={`${headerActionIconClass} drop-shadow-[0_0_4px_rgba(251,191,36,0.45)]`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.837-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={handleSaveResume}
                            disabled={loadingSave || (!isDirty && activeResumeId !== null)}
                            className={`${headerActionButtonClass} ${
                                isDirty || activeResumeId === null
                                    ? isLightMode ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100"
                                    : isLightMode ? "text-slate-500" : "text-slate-400"
                            } disabled:!cursor-default disabled:!opacity-100`}
                            title="Save current resume changes"
                            aria-label="Save current resume changes"
                        >
                            {loadingSave ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h9.5L19 5.5V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v6h8V3M8 21v-7h8v7" />
                                </svg>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={togglePdfPreview}
                            disabled={isGeneratingPdfPreview}
                            className={`${headerActionButtonClass} ${
                                isPdfPreviewOpen
                                    ? isLightMode ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100"
                                    : isLightMode ? "text-slate-600 hover:text-slate-950" : "text-slate-400 hover:text-slate-100"
                            }`}
                            title={isPdfPreviewOpen ? "Back to editing" : "Preview PDF"}
                            aria-label={isPdfPreviewOpen ? "Back to editing" : "Preview PDF"}
                            aria-pressed={isPdfPreviewOpen}
                        >
                            {isGeneratingPdfPreview ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                                    <circle cx="12" cy="12" r="2.75" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={openPdfPreview}
                            disabled={isGeneratingPdfPreview}
                            className={`${headerActionButtonClass} ${isLightMode ? "text-slate-600 hover:text-slate-950" : "text-slate-400 hover:text-slate-100"}`}
                            title="Preview PDF before download"
                            aria-label="Preview PDF before download"
                        >
                            {isGeneratingPdfPreview ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                                </svg>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRightRailCollapsed((value) => !value)}
                            className={`${headerActionButtonClass} ${
                                isRightRailCollapsed
                                    ? isLightMode ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-slate-100"
                                    : isLightMode ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100"
                            }`}
                            title={isRightRailCollapsed ? "Open Jaice drawer" : "Close Jaice drawer"}
                            aria-label={isRightRailCollapsed ? "Open Jaice drawer" : "Close Jaice drawer"}
                            aria-pressed={!isRightRailCollapsed}
                        >
                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4" y="4.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex h-4 items-center justify-center gap-2 select-none">
                    {(isDirty || isDraft) ? (
                        <>
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.55)]" />
                            <span style={{ fontSize: "10px" }} className={`${isLightMode ? "text-slate-600" : "text-slate-400"} font-medium tracking-wide`}>
                                {isDraft ? "Unsaved AI draft" : "Unsaved changes"}
                            </span>
                        </>
                    ) : (
                        <span style={{ fontSize: "10px" }} className={`${isLightMode ? "text-slate-500" : "text-slate-500"} font-medium tracking-wide`}>Saved</span>
                    )}
                </div>
            </header>

);
