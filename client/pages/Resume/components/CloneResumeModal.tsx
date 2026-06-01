import React from "react";

type CloneResumeModalProps = {
    isLightMode: boolean;
    dontAskClone: boolean;
    setDontAskClone: React.Dispatch<React.SetStateAction<boolean>>;
    setShowCloneModal: React.Dispatch<React.SetStateAction<boolean>>;
    handleCreateResume: (cloneMaster: boolean, forceMaster?: boolean) => void | Promise<void>;
    headerActionButtonClass: string;
    headerActionIconClass: string;
};

export const CloneResumeModal: React.FC<CloneResumeModalProps> = ({
    isLightMode,
    dontAskClone,
    setDontAskClone,
    setShowCloneModal,
    handleCreateResume,
    headerActionButtonClass,
    headerActionIconClass
}) => (
        <>
                <div className="modal-backdrop flex items-center justify-center" onClick={() => setShowCloneModal(false)}>
                    <div 
                        className="modal max-w-md w-full relative animate-scale-up p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Title: New Resume (with vertically centered close button) */}
                        <div className="relative mb-4 mt-2">
                            <h3
                                className={`text-center text-base font-bold ${isLightMode ? "text-slate-950" : "text-white"}`}
                                style={{ fontFamily: "var(--font-title)" }}
                            >
                                New Resume
                            </h3>
                            <button
                                onClick={() => setShowCloneModal(false)}
                                className={`${headerActionButtonClass} absolute right-0 top-1/2 -translate-y-1/2`}
                                title="Close"
                            >
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Descriptive Copy (Left-aligned, 6-7th grade reading level) */}
                        <p
                            className={`mb-6 pl-1 text-left text-xs leading-relaxed ${isLightMode ? "text-slate-800" : "text-slate-200"}`}
                            style={{ fontFamily: "var(--font-body)" }}
                        >
                            How would you like to start your new resume? You can copy all the information from your saved Primary Resume, or start fresh with a clean, blank page.
                        </p>

                        {/* Don't ask again toggle above the button row */}
                        <div className="mb-5 flex items-center gap-2 pl-1" style={{ fontFamily: "var(--font-body)" }}>
                            <input
                                type="checkbox"
                                id="dontAsk"
                                checked={dontAskClone}
                                className={`h-3 w-3 cursor-pointer rounded-[3px] text-sky-500 focus:ring-sky-500/20 ${
                                    isLightMode ? "border-slate-300 bg-white" : "border-slate-700 bg-slate-950"
                                }`}
                                onChange={(e) => setDontAskClone(e.target.checked)}
                            />
                            <label
                                htmlFor="dontAsk"
                                className={`cursor-pointer select-none text-[10px] font-medium ${isLightMode ? "text-slate-800" : "text-slate-200"}`}
                            >
                                Don't ask again
                            </label>
                        </div>

                        {/* Two buttons side-by-side: "Copy Master" (left) and "Start Fresh" (right) */}
                        <div className="flex gap-3 justify-end" style={{ fontFamily: "var(--font-body)" }}>
                            <button
                                onClick={() => {
                                    if (dontAskClone) {
                                        localStorage.setItem("resume_clone_preference", "clone");
                                    }
                                    handleCreateResume(true, false);
                                }}
                                className="resume-clone-action resume-clone-action-primary flex-1"
                            >
                                Copy Master
                            </button>
                            <button
                                onClick={() => {
                                    if (dontAskClone) {
                                        localStorage.setItem("resume_clone_preference", "scratch");
                                    }
                                    handleCreateResume(false, false);
                                }}
                                className="resume-clone-action resume-clone-action-secondary flex-1"
                            >
                                Start Fresh
                            </button>
                        </div>
                    </div>
                </div>
        </>
);
