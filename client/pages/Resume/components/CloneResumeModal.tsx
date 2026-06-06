import React from "react";
import { Modal } from "@/global-components/Modal";

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
}) => (
        <Modal
            isOpen
            onClose={() => setShowCloneModal(false)}
            modalTitle="New Resume"
            closeOnBackdrop
            className="max-w-md w-full relative animate-scale-up"
            secondaryAction={{
                label: "Copy",
                onClick: () => {
                    if (dontAskClone) {
                        localStorage.setItem("resume_clone_preference", "clone");
                    }
                    handleCreateResume(true, false);
                },
            }}
            primaryAction={{
                label: "Start",
                onClick: () => {
                    if (dontAskClone) {
                        localStorage.setItem("resume_clone_preference", "scratch");
                    }
                    handleCreateResume(false, false);
                },
                className: "green",
            }}
        >
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
        </Modal>
);
