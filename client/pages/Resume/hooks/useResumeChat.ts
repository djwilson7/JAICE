import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiError, ResumeChatMessage, ResumeChatStreamEvent, ResumeData, ResumeFormatting } from "../types";
import { CHAT_UNAVAILABLE_MESSAGE, buildAssistantCopyText, writePlainTextToClipboard } from "../chatUtils";
import { normalizeResumeDataForPayload } from "../resumeData";
import { streamResumeChatResponse } from "../resumeApi";

type UseResumeChatParams = {
    resumeData: ResumeData;
    currentResumeFormatting: ResumeFormatting;
    setError: (message: string | null) => void;
    openChatRail: () => void;
};

const CHAT_SCROLL_EDGE_THRESHOLD = 8;

export const getChatErrorMessage = (err: ApiError) => {
    if (err.status === 503) {
        return CHAT_UNAVAILABLE_MESSAGE;
    }
    if (err.status === 401 || err.status === 403) {
        return "Your session needs attention. Please sign in again and retry.";
    }
    return err.detail || err.message || "Failed to reach the resume assistant. Your message was not sent.";
};

export const useResumeChat = ({
    resumeData,
    currentResumeFormatting,
    setError,
    openChatRail
}: UseResumeChatParams) => {
    const [chatInput, setChatInput] = useState("");
    const [chatMessages, setChatMessages] = useState<ResumeChatMessage[]>([
        {
            sender: "assistant",
            text: "Hi there! I'm Jaice, your AI assistant. I can help you tailor your resume to target job listings, draft professional descriptions, or suggest high-impact improvements. What are we working on today?"
        }
    ]);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);
    const lastScrollTopRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const copyStatusTimeoutRef = useRef<number | null>(null);
    const [isChatInputCollapsed, setIsChatInputCollapsed] = useState(false);
    const [showBackToBottom, setShowBackToBottom] = useState(false);
    const [chatScrollShadow, setChatScrollShadow] = useState({
        top: false,
        bottom: false
    });
    const [isChatResponding, setIsChatResponding] = useState(false);
    const [copiedChatMessageIndex, setCopiedChatMessageIndex] = useState<number | null>(null);

    useEffect(() => {
        return () => {
            if (copyStatusTimeoutRef.current !== null) {
                window.clearTimeout(copyStatusTimeoutRef.current);
            }
        };
    }, []);

    const updateChatScrollState = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const maxScrollTop = container.scrollHeight - container.clientHeight;
        const hasOverflow = maxScrollTop > CHAT_SCROLL_EDGE_THRESHOLD;
        const isScrolledAwayFromBottom = hasOverflow && container.scrollTop < maxScrollTop - 30;

        setShowBackToBottom(isScrolledAwayFromBottom);
        setChatScrollShadow({
            top: hasOverflow && container.scrollTop > CHAT_SCROLL_EDGE_THRESHOLD,
            bottom: hasOverflow && container.scrollTop < maxScrollTop - CHAT_SCROLL_EDGE_THRESHOLD
        });

        if (!chatInput.trim()) {
            setIsChatInputCollapsed(isScrolledAwayFromBottom);
        } else {
            setIsChatInputCollapsed(false);
        }

        lastScrollTopRef.current = container.scrollTop;
    }, [chatInput]);

    useEffect(() => {
        if (chatContainerRef.current) {
            const container = chatContainerRef.current;
            const lastMsg = chatMessages[chatMessages.length - 1];
            if (!lastMsg || lastMsg.sender === "user" || !showBackToBottom) {
                container.scrollTop = container.scrollHeight;
            }
            window.requestAnimationFrame(updateChatScrollState);
        }
    }, [chatMessages, showBackToBottom, updateChatScrollState]);

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        updateChatScrollState();
        container.addEventListener("scroll", updateChatScrollState, { passive: true });

        const resizeObserver = typeof ResizeObserver === "undefined"
            ? null
            : new ResizeObserver(updateChatScrollState);
        resizeObserver?.observe(container);

        return () => {
            container.removeEventListener("scroll", updateChatScrollState);
            resizeObserver?.disconnect();
        };
    }, [updateChatScrollState]);

    useEffect(() => {
        const textarea = chatInputRef.current;
        if (textarea) {
            if (isChatInputCollapsed) {
                textarea.style.height = "36px";
            } else {
                textarea.style.height = "auto";
                textarea.style.height = `${textarea.scrollHeight}px`;
            }
        }
    }, [chatInput, isChatInputCollapsed]);

    const scrollChatToBottom = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });
        setShowBackToBottom(false);
        setIsChatInputCollapsed(false);
        window.requestAnimationFrame(updateChatScrollState);
    };

    const updateLastAssistantMessage = (updater: (message: ResumeChatMessage) => ResumeChatMessage) => {
        setChatMessages(prev => {
            const next = [...prev];
            const lastIndex = next.length - 1;
            if (lastIndex < 0 || next[lastIndex].sender !== "assistant") return prev;
            next[lastIndex] = updater(next[lastIndex]);
            return next;
        });
    };

    const appendToLastAssistantMessage = (chunk: string) => {
        updateLastAssistantMessage((message) => ({
            ...message,
            text: `${message.text}${chunk}`
        }));
    };

    const applyStreamEvent = (event: ResumeChatStreamEvent) => {
        if (event.event === "intent" && event.intent) {
            updateLastAssistantMessage((message) => ({
                ...message,
                intent: event.intent
            }));
            return;
        }

        if (event.event === "delta" && event.text) {
            appendToLastAssistantMessage(event.text);
            return;
        }

        if (event.event === "structured") {
            updateLastAssistantMessage((message) => ({
                ...message,
                intent: event.intent || message.intent,
                analysis: event.analysis || null,
                tailorSuggestions: event.tailor_suggestions || null
            }));
            return;
        }

        if (event.event === "error") {
            appendToLastAssistantMessage(event.message || "Failed to reach the resume assistant.");
        }
    };

    const handleSendChatMessage = async () => {
        if (!chatInput.trim() || isChatResponding) return;
        const userMsg = chatInput.trim();
        const history = chatMessages.slice(-10);
        setChatMessages(prev => [...prev, { sender: "user", text: userMsg }]);
        setChatInput("");
        setIsChatResponding(true);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const payload = {
                message: userMsg,
                resume_data: normalizeResumeDataForPayload({
                    ...resumeData,
                    formatting: currentResumeFormatting
                }),
                history
            };

            setChatMessages(prev => [...prev, { sender: "assistant", text: "" }]);
            const { receivedText } = await streamResumeChatResponse(
                payload,
                abortControllerRef.current?.signal,
                applyStreamEvent,
                appendToLastAssistantMessage
            );
            if (!receivedText) {
                appendToLastAssistantMessage("I did not receive a response from the local model.");
            }
        } catch (err) {
            const errorName = (err as Error)?.name;
            if (errorName === "AbortError") {
                setChatMessages(prev => {
                    if (prev.length === 0) return prev;
                    const next = [...prev];
                    const lastMsg = next[next.length - 1];
                    if (lastMsg.sender === "assistant" && lastMsg.text === "") {
                        next.pop();
                    }
                    return next;
                });
                return;
            }
            const apiError = err as ApiError;
            setChatInput(userMsg);
            setChatMessages(prev => [
                ...prev,
                {
                    sender: "assistant",
                    text: getChatErrorMessage(apiError)
                }
            ]);
        } finally {
            setIsChatResponding(false);
            abortControllerRef.current = null;
        }
    };

    const handleStopChatMessage = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsChatResponding(false);
    };

    const handleCopyAssistantMessage = async (message: ResumeChatMessage, index: number) => {
        const plainText = buildAssistantCopyText(message);
        if (!plainText) return;

        try {
            await writePlainTextToClipboard(plainText);
            setCopiedChatMessageIndex(index);

            if (copyStatusTimeoutRef.current !== null) {
                window.clearTimeout(copyStatusTimeoutRef.current);
            }

            copyStatusTimeoutRef.current = window.setTimeout(() => {
                setCopiedChatMessageIndex((currentIndex) => currentIndex === index ? null : currentIndex);
            }, 1600);
        } catch {
            setError("Failed to copy the assistant response.");
        }
    };

    const handleAnalyzeSummary = (summary: string | undefined) => {
        if (!summary) return;
        openChatRail();
        setChatInput("Review my professional summary for clarity and impact.");
        setIsChatInputCollapsed(false);
        chatInputRef.current?.focus();
    };

    const isAssistantGenerating = chatMessages.length > 0 &&
        chatMessages[chatMessages.length - 1].sender === "assistant" &&
        chatMessages[chatMessages.length - 1].text !== "";

    return {
        chatInput,
        setChatInput,
        chatMessages,
        chatContainerRef,
        chatInputRef,
        isChatInputCollapsed,
        setIsChatInputCollapsed,
        showBackToBottom,
        chatScrollShadow,
        isChatResponding,
        copiedChatMessageIndex,
        isAssistantGenerating,
        scrollChatToBottom,
        handleSendChatMessage,
        handleStopChatMessage,
        handleCopyAssistantMessage,
        handleAnalyzeSummary
    };
};
