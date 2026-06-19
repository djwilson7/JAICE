import React from "react";

type ResumePageLoadingSkeletonProps = {
    className?: string;
};

export const ResumePageLoadingSkeleton: React.FC<ResumePageLoadingSkeletonProps> = ({
    className = ""
}) => (
    <div
        className={`aspect-[8.5/11] h-full max-h-full max-w-full animate-pulse overflow-hidden rounded-sm border border-slate-300 bg-white p-[9%] shadow-[0_18px_44px_rgba(15,23,42,0.2)] ${className}`}
        data-testid="resume-page-loading-skeleton"
        aria-label="Loading resume"
    >
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
);
