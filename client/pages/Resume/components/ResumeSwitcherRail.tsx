import React from "react";
import { SearchBar } from "@/global-components/SearchBar";
import type { SavedResume } from "../types";

type ResumeSwitcherRailProps = {
    isLightMode: boolean;
    isLeftRailCollapsed: boolean;
    railShellStyle: React.CSSProperties;
    railHeaderRowClass: string;
    railTitleClass: string;
    railTitleStyle: React.CSSProperties;
    headerActionButtonClass: string;
    headerActionIconClass: string;
    handleCreateNewClick: () => void;
    searchQuery: string;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    resumeSearchFocusSignal: number;
    loadingList: boolean;
    filteredResumes: SavedResume[];
    activeResumeId: string | null;
    loadResumeIntoWorkspace: (resume: SavedResume) => void;
    handleDeleteResume: (id: string, e: React.MouseEvent) => void | Promise<void>;
};

export const ResumeSwitcherRail: React.FC<ResumeSwitcherRailProps> = ({
    isLightMode, isLeftRailCollapsed, railShellStyle, railHeaderRowClass, railTitleClass, railTitleStyle,
    headerActionButtonClass, headerActionIconClass, handleCreateNewClick, searchQuery, setSearchQuery,
    resumeSearchFocusSignal, loadingList, filteredResumes, activeResumeId, loadResumeIntoWorkspace, handleDeleteResume
}) => (
            <aside 
                className={`h-full min-h-0 self-stretch border-r flex flex-col print:hidden shrink-0 z-10 overflow-hidden transition-[width,border-color,box-shadow] duration-300 ${
                    isLeftRailCollapsed ? "w-0 border-transparent shadow-none" : isLightMode ? "w-72 shadow-[18px_0_50px_rgba(15,23,42,0.12)]" : "w-72 shadow-[18px_0_60px_rgba(0,0,0,0.22)]"
                }`}
                style={{ ...railShellStyle, borderColor: isLeftRailCollapsed ? "transparent" : railShellStyle.borderColor }}
            >
                <div
                    className={`flex h-full min-h-0 w-72 flex-col gap-5 p-5 transition-opacity duration-150 ${
                        isLeftRailCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
                    }`}
                    style={{ fontFamily: "var(--font-body)" }}
                >
                    <div>
                    <div className={`${railHeaderRowClass} mb-3 justify-between items-center w-full`}>
                        <div className="min-w-0 overflow-hidden">
                            <div className={railTitleClass} style={railTitleStyle}>Resumes</div>
                        </div>
                        <button
                            onClick={handleCreateNewClick}
                            className={headerActionButtonClass}
                            title="Create a new resume."
                            aria-label="Create a new resume."
                        >
                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                    </div>
                    <div className="mt-3.5">
                        <SearchBar
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            placeholder="Search resumes..."
                            searchTitle={isLeftRailCollapsed ? "Expand and search resumes" : "Search resumes"}
                            inputTitle="Search by resume name or candidate name."
                            focusSignal={resumeSearchFocusSignal}
                            className="!w-full"
                            variant="premium"
                        />
                    </div>
                </div>

                {/* List container */}
                <div className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 scrollbar-thin">
                    {loadingList ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500 text-xs py-8">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500"></div>
                            <span>Loading profiles...</span>
                        </div>
                    ) : filteredResumes.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed rounded-xl ${
                            isLightMode ? "border-slate-300/80 bg-white/30" : "border-slate-800/40"
                        }`}>
                            <svg className={`h-5 w-5 mb-1.5 ${isLightMode ? "text-slate-400" : "text-slate-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-[11px] text-slate-500 leading-normal whitespace-nowrap">
                                {searchQuery ? "No matching versions found." : "No saved resumes."}
                            </p>
                        </div>
                    ) : (
                        filteredResumes.map((res) => {
                            const isActive = activeResumeId === res.id;
                            return (
                                <div
                                    key={res.id}
                                    onClick={() => loadResumeIntoWorkspace(res)}
                                    className={`group relative flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 cursor-pointer transition-all duration-300 ${
                                        isActive
                                            ? isLightMode
                                                ? "bg-white/82 border-sky-500/45 text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
                                                : "bg-slate-950/60 border-sky-400/45 text-slate-100 shadow-[0_10px_32px_rgba(0,0,0,0.34)]"
                                            : isLightMode
                                                ? "hover:bg-white/60 border-transparent text-slate-600 hover:text-slate-900"
                                                : "hover:bg-slate-800/30 border-transparent text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    {/* Selection left stripe */}
                                    {isActive && (
                                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-sky-400 to-blue-500 rounded-r shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
                                    )}
                                    
                                    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden pl-1">
                                        {res.is_master && (
                                            <svg className="h-3.5 w-3.5 shrink-0 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.45)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                        )}
                                        <p
                                            className={`min-w-0 flex-1 overflow-hidden truncate whitespace-nowrap font-semibold leading-snug ${
                                                isActive
                                                    ? isLightMode ? "text-slate-900" : "text-slate-100"
                                                    : isLightMode ? "text-slate-700" : "text-slate-300"
                                            }`}
                                            style={{ fontSize: "12px" }}
                                        >
                                            {res.name}
                                        </p>
                                    </div>

                                    <div className="relative h-8 w-14 shrink-0 overflow-hidden">
                                        <span
                                            className="absolute inset-0 flex items-center justify-end whitespace-nowrap text-right font-medium text-slate-500 transition-all duration-200 group-hover:-translate-x-2 group-hover:opacity-0"
                                            style={{ fontSize: "10px" }}
                                        >
                                            {new Date(res.updated_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                                        </span>
                                        <button
                                            onClick={(e) => handleDeleteResume(res.id, e)}
                                            className={`${headerActionButtonClass} absolute right-0 top-0 translate-x-3 text-slate-500 opacity-0 transition-all duration-200 hover:text-rose-400 group-hover:translate-x-0 group-hover:opacity-100 focus:translate-x-0 focus:opacity-100`}
                                            title="Delete version"
                                            aria-label={`Delete ${res.name}`}
                                        >
                                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                </div>
            </aside>


);
