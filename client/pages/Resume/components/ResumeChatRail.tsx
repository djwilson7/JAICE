import React from "react";
import { ChatMarkdown } from "@/global-components/ChatMarkdown";
import type { ResumeChatMessage } from "../types";

type ResumeChatRailProps = {
    isLightMode: boolean;
    isRightRailCollapsed: boolean;
    rightRailShellStyle: React.CSSProperties;
    railHeaderRowClass: string;
    railTitleClass: string;
    railTitleStyle: React.CSSProperties;
    chatContainerRef: React.RefObject<HTMLDivElement | null>;
    chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
    chatMessages: ResumeChatMessage[];
    copiedChatMessageIndex: number | null;
    handleCopyAssistantMessage: (message: ResumeChatMessage, index: number) => void | Promise<void>;
    isChatResponding: boolean;
    isAssistantGenerating: boolean;
    showBackToBottom: boolean;
    scrollChatToBottom: () => void;
    isChatInputCollapsed: boolean;
    setIsChatInputCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    chatInput: string;
    setChatInput: React.Dispatch<React.SetStateAction<string>>;
    handleSendChatMessage: () => void | Promise<void>;
    handleStopChatMessage: () => void;
};

export const ResumeChatRail: React.FC<ResumeChatRailProps> = ({
    isLightMode, isRightRailCollapsed, rightRailShellStyle, railHeaderRowClass,
    railTitleClass, railTitleStyle, chatContainerRef, chatInputRef,
    chatMessages, copiedChatMessageIndex, handleCopyAssistantMessage, isChatResponding, isAssistantGenerating,
    showBackToBottom, scrollChatToBottom, isChatInputCollapsed, setIsChatInputCollapsed, chatInput, setChatInput,
    handleSendChatMessage, handleStopChatMessage
}) => (
            <aside 
                    className={`relative h-full min-h-0 self-stretch border-l flex flex-col print:hidden overflow-hidden shrink-0 animate-slide-left transition-[width,border-color,box-shadow] duration-300 ${
                        isRightRailCollapsed ? "w-0 border-transparent shadow-none" : isLightMode ? "w-88 shadow-[-18px_0_50px_rgba(15,23,42,0.12)]" : "w-88 shadow-[-18px_0_60px_rgba(0,0,0,0.22)]"
                    }`}
                    style={{ ...rightRailShellStyle, borderColor: isRightRailCollapsed ? "transparent" : rightRailShellStyle.borderColor }}
                >
                    <div className={`absolute inset-0 flex min-h-0 w-88 flex-col gap-4 p-5 pb-0 transition-opacity duration-150 ${
                        isRightRailCollapsed ? "pointer-events-none opacity-0" : "opacity-100"
                    }`}>
                    <div className={`${railHeaderRowClass} justify-between shrink-0`}>
                        <div className="flex items-center gap-2">
                            <div className={railTitleClass} style={railTitleStyle}>Jaice</div>
                        </div>
                    </div>

                    {/* Chat Messages Thread */}
                    <div 
                        ref={chatContainerRef}
                        className="flex-1 min-h-0 overflow-y-auto pr-1 py-1 pb-44 space-y-4 no-scrollbar flex flex-col"
                    >
                        {chatMessages.map((msg, i) => {
                            if (msg.sender === "assistant" && msg.text === "") return null;
                            return (
                                <div
                                    key={i}
                                    className="flex flex-col w-full animate-fade-in"
                                >
                                    <div 
                                        style={{
                                            borderRadius: "16px"
                                        }}
                                        className={`relative w-full px-5 py-3.5 text-xs text-left leading-relaxed break-words ${
                                            msg.sender === "user" 
                                                ? `whitespace-pre-wrap ${
                                                    isLightMode
                                                        ? "bg-white/76 text-slate-900 border border-slate-300/80 shadow-[0_10px_24px_rgba(15,23,42,0.10)]"
                                                        : "bg-slate-100/[0.075] text-slate-50 border border-slate-400/20 shadow-[0_10px_28px_rgba(2,6,23,0.32)]" 
                                                  }`
                                                : isLightMode
                                                    ? "bg-sky-50/90 pr-12 text-slate-900 border border-sky-300/70 shadow-lg shadow-sky-600/5"
                                                    : "bg-slate-950/45 pr-12 text-slate-100 border border-sky-500/40 shadow-lg shadow-sky-600/5"
                                        }`}
                                    >
                                        {msg.sender === "assistant" ? (
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyAssistantMessage(msg, i)}
                                                    className={`absolute right-3 top-3 !inline-flex h-7 !h-7 w-7 !w-7 items-center justify-center rounded-md border !p-0 transition-[background,border-color,color,transform] active:scale-95 ${
                                                        isLightMode
                                                            ? "border-sky-200/80 bg-white/70 text-slate-500 hover:border-sky-300 hover:bg-white hover:text-slate-900"
                                                            : "border-white/12 bg-slate-900/70 text-slate-400 hover:border-sky-300/35 hover:bg-slate-800/80 hover:text-slate-100"
                                                    }`}
                                                    title={copiedChatMessageIndex === i ? "Copied plain text" : "Copy plain text"}
                                                    aria-label={copiedChatMessageIndex === i ? "Copied plain text" : "Copy assistant response as plain text"}
                                                >
                                                    {copiedChatMessageIndex === i ? (
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                            <rect x="8" y="8" width="10" height="12" rx="2" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <ChatMarkdown content={msg.text} isLightMode={isLightMode} />
                                                {msg.analysis && (
                                                    <div className={`rounded-lg border p-3 ${
                                                        isLightMode ? "border-sky-200 bg-white/70" : "border-sky-400/25 bg-slate-900/42"
                                                    }`}>
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <span className={`text-[10px] font-bold uppercase tracking-wide ${isLightMode ? "text-slate-600" : "text-slate-300"}`}>
                                                                Match analysis
                                                            </span>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isLightMode ? "bg-sky-100 text-sky-800" : "bg-sky-400/15 text-sky-100"}`}>
                                                                {msg.analysis.match_score}/100
                                                            </span>
                                                        </div>
                                                        {[
                                                            ["Requirements", msg.analysis.requirements],
                                                            ["Overlap", msg.analysis.overlap],
                                                            ["Gaps", msg.analysis.gaps],
                                                            ["Missing keywords", msg.analysis.missing_keywords],
                                                            ["Suggestions", msg.analysis.suggestions]
                                                        ].map(([label, items]) => (
                                                            Array.isArray(items) && items.length > 0 ? (
                                                                <div key={label as string} className="mt-2">
                                                                    <div className={`mb-1 text-[10px] font-semibold ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>{label as string}</div>
                                                                    <ul className="list-disc space-y-1 pl-4">
                                                                        {items.map((item) => <li key={item}>{item}</li>)}
                                                                    </ul>
                                                                </div>
                                                            ) : null
                                                        ))}
                                                    </div>
                                                )}
                                                {msg.tailorSuggestions && (
                                                    <div className={`rounded-lg border p-3 ${
                                                        isLightMode ? "border-emerald-200 bg-white/70" : "border-emerald-400/25 bg-slate-900/42"
                                                    }`}>
                                                        <div className={`mb-2 text-[10px] font-bold uppercase tracking-wide ${isLightMode ? "text-slate-600" : "text-slate-300"}`}>
                                                            Suggested resume wording
                                                        </div>
                                                        {msg.tailorSuggestions.summary.map((item, index) => (
                                                            <div key={`summary-${index}`} className="mb-3">
                                                                <div className={`mb-1 text-[10px] font-semibold ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>Summary</div>
                                                                <div className="whitespace-pre-wrap">{item.suggested_text}</div>
                                                                <div className={`mt-1 text-[10px] ${isLightMode ? "text-slate-500" : "text-slate-400"}`}>{item.reason}</div>
                                                            </div>
                                                        ))}
                                                        {msg.tailorSuggestions.experience_bullets.map((item, index) => (
                                                            <div key={`${item.experience_id || "exp"}-${item.bullet_index}-${index}`} className="mb-3 last:mb-0">
                                                                <div className={`mb-1 text-[10px] font-semibold ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>
                                                                    {item.role_title || "Experience"} bullet {item.bullet_index + 1}
                                                                </div>
                                                                <div className="whitespace-pre-wrap">{item.suggested_text}</div>
                                                                <div className={`mt-1 text-[10px] ${isLightMode ? "text-slate-500" : "text-slate-400"}`}>{item.reason}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : msg.text}
                                    </div>

                                    <span 
                                        style={{ fontSize: "8px" }}
                                        className={`text-[8px] text-slate-500 mt-1.5 font-semibold tracking-wider ${
                                            msg.sender === "user" 
                                                ? "self-end pr-5 text-right" 
                                                : "self-start pl-5 text-left"
                                        }`}
                                    >
                                        {msg.sender === "user" ? "You" : "Jaice"}
                                    </span>
                                </div>
                            );
                        })}
                        {isChatResponding && !isAssistantGenerating && (
                            <div className="flex flex-col w-full gap-2 pl-5 pr-1 py-1 animate-fade-in text-left items-start justify-start">
                                <div className={`text-[10px] font-semibold tracking-wider text-left self-start ${isLightMode ? "text-shimmer-light" : "text-shimmer-dark"}`}>
                                    Jaice is thinking...
                                </div>
                            </div>
                        )}
                    </div>

                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-px bg-transparent ${
                            isLightMode ? "shadow-[0_-28px_44px_28px_rgba(226,232,240,0.72)]" : "shadow-[0_-28px_44px_28px_rgba(2,6,23,0.36)]"
                        }`}
                    />

                    {/* Bottom Chat Input & Send Button Container */}
                    <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-col gap-2">
                        <button
                            type="button"
                            onClick={scrollChatToBottom}
                            className={`absolute -top-11 right-0 !inline-flex h-8 !h-8 w-8 !w-8 items-center justify-center rounded-full border !p-0 backdrop-blur-md transition-all duration-200 ${
                                isLightMode
                                    ? "border-slate-300/80 bg-white/86 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.14)] hover:border-sky-400/60 hover:bg-white hover:text-slate-950"
                                    : "border-white/14 bg-slate-950/70 text-slate-300 shadow-[0_10px_28px_rgba(2,6,23,0.45)] hover:border-sky-300/40 hover:bg-slate-900/80 hover:text-white"
                            } ${
                                showBackToBottom
                                    ? "translate-y-0 opacity-100"
                                    : "pointer-events-none translate-y-2 opacity-0"
                            }`}
                            title="Back to bottom"
                            aria-label="Back to bottom"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M12 19l7-7M12 19l-7-7" />
                            </svg>
                        </button>
                        <div 
                            style={{
                                background: isLightMode
                                    ? "linear-gradient(180deg, rgba(255,255,255,0.84), rgba(241,245,249,0.74))"
                                    : "linear-gradient(180deg, rgba(15,23,42,0.62), rgba(2,6,23,0.46))",
                                backdropFilter: "blur(24px) saturate(150%)",
                                WebkitBackdropFilter: "blur(24px) saturate(150%)",
                                isolation: "isolate"
                            }}
                            className={`flex flex-col w-full rounded-xl border overflow-hidden focus-within:ring-2 focus-within:ring-sky-300/12 transition-all ${
                                isLightMode
                                    ? "border-slate-300/80 focus-within:border-sky-500/45 shadow-[0_12px_32px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.86)]"
                                    : "border-white/18 focus-within:border-sky-200/45 shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(15,23,42,0.42)]"
                            }`}
                        >
                             <textarea
                                ref={chatInputRef}
                                onFocus={() => setIsChatInputCollapsed(false)}
                                style={{ 
                                    fontSize: "12px",
                                    minHeight: isChatInputCollapsed ? "36px" : "54px",
                                    maxHeight: isChatInputCollapsed ? "36px" : "112px",
                                    paddingTop: isChatInputCollapsed ? "8px" : "14px",
                                    paddingBottom: isChatInputCollapsed ? "8px" : "8px"
                                }}
                                className={`w-full resize-none overflow-y-auto p-3.5 pb-2 text-[12px] outline-none leading-relaxed placeholder:text-slate-500 font-sans transition-all duration-300 ${
                                    isLightMode ? "bg-white/40 text-slate-900" : "bg-slate-950/[0.18] text-slate-100"
                                }`}
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        if (!isChatResponding) {
                                            handleSendChatMessage();
                                        }
                                    }
                                }}
                                placeholder="Type a message or paste a job posting..."
                            />
                            {/* Bottom Rail inside the Input Card */}
                            <div className={`flex items-center justify-between px-3 border-t transition-all duration-300 ${
                                isLightMode ? "border-slate-300/70 bg-slate-100/42" : "border-white/10 bg-slate-950/[0.12]"
                            } ${
                                isChatInputCollapsed 
                                    ? "h-0 opacity-0 py-0 border-t-transparent pointer-events-none overflow-hidden" 
                                    : "h-11 opacity-100 pb-1 py-0 pointer-events-auto"
                            }`}>
                                <div className="relative flex items-center gap-2">
                                    <span
                                        style={{ fontSize: "10px" }}
                                        className={`font-semibold tracking-wide ${
                                            isLightMode ? "text-slate-600" : "text-slate-400"
                                        }`}
                                    >
                                        Resume chat
                                    </span>
                                </div>
                                <div className="flex items-center justify-end relative h-7 w-7">
                                    {isChatResponding ? (
                                        <button
                                            type="button"
                                            onClick={handleStopChatMessage}
                                            style={{
                                                width: "28px",
                                                height: "28px",
                                                padding: 0,
                                                borderRadius: "9999px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                                                maxHeight: "none",
                                                border: "1px solid rgba(239, 68, 68, 0.25)"
                                            }}
                                            className="group absolute right-0 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 text-white transition-all duration-300 transform active:scale-95 overflow-hidden cursor-pointer"
                                            title="Stop generating"
                                        >
                                            <svg 
                                                className="h-3 w-3" 
                                                fill="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <rect x="5" y="5" width="14" height="14" rx="2" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleSendChatMessage}
                                            disabled={!chatInput.trim()}
                                            style={{
                                                width: "28px",
                                                height: "28px",
                                                padding: 0,
                                                borderRadius: "9999px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                                                maxHeight: "none",
                                                border: "1px solid rgba(14, 165, 233, 0.25)"
                                            }}
                                            className={`group absolute right-0 flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 hover:bg-sky-500 text-white transition-all duration-300 transform active:scale-95 overflow-hidden ${
                                                chatInput.trim()
                                                    ? "opacity-100 scale-100 cursor-pointer" 
                                                    : "opacity-0 scale-0 pointer-events-none"
                                            }`}
                                            title="Send message"
                                        >
                                            <svg 
                                                className={`h-4 w-4 transition-all duration-300 transform ${
                                                    chatInput.trim()
                                                        ? "translate-y-0 opacity-100 group-hover:-translate-y-0.5"
                                                        : "translate-y-4 opacity-0"
                                                }`} 
                                                fill="none" 
                                                viewBox="0 0 24 24" 
                                                stroke="currentColor" 
                                                strokeWidth="3"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M12 5l-7 7M12 5l7 7" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>
                </aside>

);
