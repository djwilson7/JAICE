import type { ResumeChatMessage } from "./types";

export const CHAT_UNAVAILABLE_MESSAGE = "The local model is not available. Confirm Ollama is running and the configured model has been pulled.";
export const REWRITE_REVIEWABLE_MESSAGE = "Jaice could not generate a reviewable rewrite. Please try again.";

export const stripMarkdownFormatting = (value: string) => {
    return value
        .replace(/\r\n?/g, "\n")
        .replace(/```[^\n]*\n?([\s\S]*?)```/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
        .replace(/^\s*\[[^\]]+\]:\s+\S+.*$/gm, "")
        .replace(/^\s{0,3}#{1,6}\s*/gm, "")
        .replace(/^\s{0,3}>\s?/gm, "")
        .replace(/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/gm, "")
        .replace(/^\s*\|(.+)\|\s*$/gm, (_, row: string) => row.split("|").map((cell) => cell.trim()).filter(Boolean).join("  "))
        .replace(/^\s*[-*_]{3,}\s*$/gm, "")
        .replace(/^\s*\[[ xX]\]\s+/gm, "")
        .replace(/^\s*[-*+]\s+/gm, "")
        .replace(/^\s*\d+[.)]\s+/gm, "")
        .replace(/(\*\*|__)(.*?)\1/g, "$2")
        .replace(/(\*|_)(.*?)\1/g, "$2")
        .replace(/~~(.*?)~~/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
};

export const buildAssistantCopyText = (message: ResumeChatMessage) => {
    const parts = [stripMarkdownFormatting(message.text)].filter(Boolean);

    if (message.analysis) {
        const analysisLines = [
            "Match analysis",
            `Match score: ${message.analysis.match_score}/100`,
            "Requirements",
            ...message.analysis.requirements.map(stripMarkdownFormatting),
            "Overlap",
            ...message.analysis.overlap.map(stripMarkdownFormatting),
            "Gaps",
            ...message.analysis.gaps.map(stripMarkdownFormatting),
            "Missing keywords",
            ...message.analysis.missing_keywords.map(stripMarkdownFormatting),
            "Suggestions",
            ...message.analysis.suggestions.map(stripMarkdownFormatting)
        ].filter(Boolean);
        parts.push(analysisLines.join("\n"));
    }

    if (message.tailorSuggestions) {
        const suggestionLines = ["Suggested resume wording"];
        message.tailorSuggestions.summary.forEach((item) => {
            suggestionLines.push("Summary", stripMarkdownFormatting(item.suggested_text), `Reason: ${stripMarkdownFormatting(item.reason)}`);
        });
        message.tailorSuggestions.experience_bullets.forEach((item) => {
            suggestionLines.push(
                `${item.role_title || "Experience"} bullet ${item.bullet_index + 1}`,
                stripMarkdownFormatting(item.suggested_text),
                `Reason: ${stripMarkdownFormatting(item.reason)}`
            );
        });
        parts.push(suggestionLines.filter(Boolean).join("\n"));
    }

    return parts.join("\n\n").trim();
};

export const writePlainTextToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const didCopy = document.execCommand("copy");
        if (!didCopy) {
            throw new Error("Clipboard copy failed.");
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

