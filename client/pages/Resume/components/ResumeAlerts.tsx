import React from "react";

type ResumeAlertsProps = {
    error: string | null;
    successMessage: string | null;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
    setSuccessMessage: React.Dispatch<React.SetStateAction<string | null>>;
    headerActionButtonClass: string;
    headerActionIconClass: string;
};

export const ResumeAlerts: React.FC<ResumeAlertsProps> = ({
    error,
    successMessage,
    setError,
    setSuccessMessage,
    headerActionButtonClass,
    headerActionIconClass
}) => (
    <>
        {(error || successMessage) && (
                    <div className="pointer-events-none absolute left-1/2 top-4 z-40 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 print:hidden">
                        {error && (
                            <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg border border-rose-400/45 bg-rose-950/70 px-4 py-1.5 text-xs text-rose-100 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-md animate-fade-in" style={{ fontFamily: "var(--font-body)" }}>
                                <span className="flex-1 leading-normal pl-1">{error}</span>
                                <button
                                    onClick={() => setError(null)}
                                    className={`${headerActionButtonClass} text-rose-300 hover:text-rose-100`}
                                    title="Dismiss alert"
                                >
                                    <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        {successMessage && (
                            <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-lg border border-emerald-400/45 bg-emerald-950/70 px-4 py-1.5 text-xs text-emerald-100 shadow-[0_14px_34px_rgba(2,6,23,0.38)] backdrop-blur-md animate-fade-in" style={{ fontFamily: "var(--font-body)" }}>
                                <span className="flex-1 leading-normal pl-1">{successMessage}</span>
                                <button
                                    onClick={() => setSuccessMessage(null)}
                                    className={`${headerActionButtonClass} text-emerald-300 hover:text-emerald-100`}
                                    title="Dismiss alert"
                                >
                                    <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
        )}
    </>
);
