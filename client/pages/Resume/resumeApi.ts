import { api, apiBlob } from "@/global-services/api";
import { getIdToken } from "@/global-services/auth";
import type {
    ApiError,
    ResumeChatMessage,
    ResumeChatStreamEvent,
    ResumeChatTailorSuggestions,
    ResumeData,
    ResumeRewriteSectionRequest,
    ResumeRewriteStreamEvent,
    SavedResume
} from "./types";
import { REWRITE_REVIEWABLE_MESSAGE, stripMarkdownFormatting } from "./chatUtils";

type ResumeListResponse = {
    status: "success";
    resumes: SavedResume[];
};

type ResumeMutationResponse = {
    status: "success";
    resume: SavedResume;
};

export type ResumeChatStreamPayload = {
    message: string;
    resume_data: ResumeData;
    history: ResumeChatMessage[];
};

const readResponseError = async (response: Response) => {
    let detail = `${response.status} ${response.statusText}`;
    try {
        const errorBody = await response.json();
        detail = errorBody?.detail || detail;
    } catch {
        // Keep the status text when the server does not return JSON.
    }
    const error = new Error(`API request failed: ${detail}`) as ApiError;
    error.status = response.status;
    error.detail = detail;
    return error;
};

export const listSavedResumes = () => {
    return api("/api/resume/resumes") as Promise<ResumeListResponse>;
};

export const createSavedResume = (payload: {
    name: string;
    is_master: boolean;
    source_resume_id: string | null;
    resume_data: ResumeData;
}) => {
    return api("/api/resume/resumes", {
        method: "POST",
        body: JSON.stringify(payload)
    }) as Promise<ResumeMutationResponse>;
};

export const updateSavedResume = (
    id: string,
    payload: {
        name: string;
        is_master: boolean;
        resume_data: ResumeData;
    }
) => {
    return api(`/api/resume/resumes/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
    }) as Promise<ResumeMutationResponse>;
};

export const deleteSavedResume = (id: string) => {
    return api(`/api/resume/resumes/${id}`, {
        method: "DELETE"
    }) as Promise<{ status: "success" }>;
};

export const exportResumePdf = (resumeData: ResumeData) => {
    return apiBlob("/api/resume/export-pdf", {
        method: "POST",
        body: JSON.stringify(resumeData)
    });
};

export const streamResumeTailorSuggestion = async (
    payload: ResumeRewriteSectionRequest,
    onEvent: (event: ResumeRewriteStreamEvent) => void
): Promise<{ assistantMessage: string; tailorSuggestions: ResumeChatTailorSuggestions | null }> => {
    const token = await getIdToken();
    const baseUrl = import.meta.env.VITE_API_BASE_URL_LOCAL;
    const response = await fetch(`${baseUrl}/api/resume/rewrite-suggestion/stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw await readResponseError(response);
    }

    if (!response.body) {
        throw new Error("Streaming rewrite response was empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: { assistantMessage: string; tailorSuggestions: ResumeChatTailorSuggestions | null } | null = null;
    let streamError: string | null = null;

    const processBufferedLines = (flush = false) => {
        const lines = buffer.split("\n");
        buffer = flush ? "" : lines.pop() || "";
        const completeLines = flush ? lines.filter(Boolean) : lines;

        for (const line of completeLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            const event = JSON.parse(trimmed) as ResumeRewriteStreamEvent;
            onEvent(event);

            if (event.event === "error") {
                streamError = event.message || "Failed to generate resume rewrite.";
            }

            if (event.event === "structured") {
                finalResult = {
                    assistantMessage: stripMarkdownFormatting(event.assistant_message || ""),
                    tailorSuggestions: event.tailor_suggestions || null
                };
            }
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
            buffer += chunk;
            processBufferedLines();
        }
    }

    const finalChunk = decoder.decode();
    if (finalChunk) {
        buffer += finalChunk;
    }
    processBufferedLines(true);

    if (streamError) {
        const error = new Error(streamError) as ApiError;
        error.detail = streamError;
        throw error;
    }

    if (!finalResult) {
        throw new Error(REWRITE_REVIEWABLE_MESSAGE);
    }

    return finalResult;
};

export const streamResumeChatResponse = async (
    payload: ResumeChatStreamPayload,
    signal: AbortSignal | undefined,
    onEvent: (event: ResumeChatStreamEvent) => void,
    onTextFallback: (text: string) => void
) => {
    const token = await getIdToken();
    const baseUrl = import.meta.env.VITE_API_BASE_URL_LOCAL;
    const response = await fetch(`${baseUrl}/api/resume/chat/stream`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload),
        signal
    });

    if (!response.ok) {
        throw await readResponseError(response);
    }

    if (!response.body) {
        throw new Error("Streaming response was empty.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let receivedText = false;
    let buffer = "";

    const processBufferedLines = (flush = false) => {
        const lines = buffer.split("\n");
        buffer = flush ? "" : lines.pop() || "";
        const completeLines = flush ? lines.filter(Boolean) : lines;

        for (const line of completeLines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            try {
                const event = JSON.parse(trimmed) as ResumeChatStreamEvent;
                if (event.event === "delta" && event.text) {
                    receivedText = true;
                }
                onEvent(event);
            } catch {
                receivedText = true;
                onTextFallback(line);
            }
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
            buffer += chunk;
            processBufferedLines();
        }
    }

    const finalChunk = decoder.decode();
    if (finalChunk) {
        buffer += finalChunk;
    }
    processBufferedLines(true);

    return { receivedText };
};
