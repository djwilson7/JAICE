import { useRef, useState } from "react";
import type React from "react";
import type {
    ApiError,
    ChangeMetadata,
    ExperienceItem,
    ExperienceRewriteItem,
    ExperienceRewriteSuggestion,
    ResumeData,
    ResumeFormatting,
    ResumeRewriteActionHover,
    SummaryRewriteSuggestion
} from "../types";
import { REWRITE_REVIEWABLE_MESSAGE, stripMarkdownFormatting } from "../chatUtils";
import { streamResumeTailorSuggestion } from "../resumeApi";
import { getChatErrorMessage } from "./useResumeChat";

type UseResumeRewriteSuggestionsParams = {
    resumeData: ResumeData;
    setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
    currentResumeFormatting: ResumeFormatting;
    setError: (message: string | null) => void;
    setSuccessMessage: (message: string | null) => void;
};

export const useResumeRewriteSuggestions = ({
    resumeData,
    setResumeData,
    currentResumeFormatting,
    setError,
    setSuccessMessage
}: UseResumeRewriteSuggestionsParams) => {
    const [isDraft, setIsDraft] = useState(false);
    const [originalResumeDataBeforeDraft, setOriginalResumeDataBeforeDraft] = useState<ResumeData | null>(null);
    const [changeMetadata, setChangeMetadata] = useState<ChangeMetadata[]>([]);
    const [loadingSummaryImprove, setLoadingSummaryImprove] = useState(false);
    const [loadingExperienceImproveId, setLoadingExperienceImproveId] = useState<string | null>(null);
    const [summaryRewriteSuggestion, setSummaryRewriteSuggestion] = useState<SummaryRewriteSuggestion | null>(null);
    const [experienceRewriteSuggestions, setExperienceRewriteSuggestions] = useState<Record<string, ExperienceRewriteSuggestion>>({});
    const [rewriteActionHover, setRewriteActionHover] = useState<ResumeRewriteActionHover | null>(null);
    const rewriteQueueRef = useRef<Promise<void>>(Promise.resolve());

    const resetDraftState = () => {
        setIsDraft(false);
        setOriginalResumeDataBeforeDraft(null);
        setChangeMetadata([]);
    };

    const getRewriteUserMessage = (message?: string | null, fallback = REWRITE_REVIEWABLE_MESSAGE) => {
        const normalized = stripMarkdownFormatting(message || "").trim();
        const looksLikeRawModelOutput =
            normalized.length > 260 ||
            /^[{[]/.test(normalized) ||
            /\b(tailor_suggestions|assistant_message|suggested_text|experience_bullets)\b/i.test(normalized);

        return looksLikeRawModelOutput ? fallback : normalized || fallback;
    };

    const getRewriteErrorMessage = (err: ApiError) => {
        return getRewriteUserMessage(getChatErrorMessage(err));
    };

    const enqueueRewriteJob = (job: () => Promise<void>) => {
        rewriteQueueRef.current = rewriteQueueRef.current.then(job, job);
    };

    const handleImproveSummary = async () => {
        if (!resumeData.summary) return;
        if (summaryRewriteSuggestion?.isStreaming) return;
        const currentSummary = resumeData.summary || "";
        const queuedSuggestion: SummaryRewriteSuggestion = {
            target: "summary",
            assistantMessage: "",
            currentText: currentSummary,
            suggestedText: "",
            reason: "",
            isQueued: true,
            isStreaming: true
        };
        setSummaryRewriteSuggestion(queuedSuggestion);
        setError(null);

        enqueueRewriteJob(async () => {
            setLoadingSummaryImprove(true);
            setSummaryRewriteSuggestion((current) =>
                current
                    ? { ...current, isQueued: false, isStreaming: true }
                    : { ...queuedSuggestion, isQueued: false }
            );

            try {
                const result = await streamResumeTailorSuggestion({
                    target: "summary",
                    summary_text: currentSummary,
                    guidance: "Rewrite this professional summary to be clearer and tighter without adding new factual claims. Safe synonyms and cleaner phrasing are allowed when they preserve the same meaning. If the source text is too thin to improve truthfully, return it unchanged."
                }, (event) => {
                    if (event.event === "delta" && event.target === "summary" && event.text !== undefined) {
                        setSummaryRewriteSuggestion((current) =>
                            current
                                ? { ...current, suggestedText: event.text || "", isQueued: false, isStreaming: true }
                                : current
                        );
                    }
                });
                const summarySuggestion = result.tailorSuggestions?.summary?.[0];
                if (!summarySuggestion?.suggested_text?.trim()) {
                    setSummaryRewriteSuggestion(null);
                    setError(getRewriteUserMessage(result.assistantMessage, "Jaice did not return a reviewable summary rewrite. Please try again."));
                    return;
                }

                setSummaryRewriteSuggestion({
                    target: "summary",
                    assistantMessage: result.assistantMessage,
                    currentText: currentSummary,
                    suggestedText: summarySuggestion.suggested_text.trim(),
                    reason: summarySuggestion.reason || "AI suggested a clearer professional summary.",
                    isStreaming: false
                });
            } catch (err) {
                console.error(err);
                setSummaryRewriteSuggestion((current) => current?.isStreaming ? null : current);
                setError(getRewriteErrorMessage(err as ApiError));
            } finally {
                setLoadingSummaryImprove(false);
            }
        });
    };

    const updateExperienceRewriteItem = (
        experienceId: string,
        bulletId: string,
        updater: (item: ExperienceRewriteItem) => ExperienceRewriteItem
    ) => {
        setExperienceRewriteSuggestions((current) => {
            const existing = current[experienceId];
            if (!existing) return current;
            const items = existing.items.map((item) => item.bulletId === bulletId ? updater(item) : item);
            return {
                ...current,
                [experienceId]: {
                    ...existing,
                    isQueued: items.some((item) => item.isQueued),
                    isStreaming: items.some((item) => item.isStreaming),
                    items
                }
            };
        });
    };

    const removeExperienceRewriteItem = (experienceId: string, bulletId: string) => {
        setExperienceRewriteSuggestions((current) => {
            const existing = current[experienceId];
            if (!existing) return current;
            const items = existing.items.filter((item) => item.bulletId !== bulletId);
            const next = { ...current };
            if (items.length) {
                next[experienceId] = {
                    ...existing,
                    isQueued: items.some((item) => item.isQueued),
                    isStreaming: items.some((item) => item.isStreaming),
                    items
                };
            } else {
                delete next[experienceId];
            }
            return next;
        });
    };

    const handleImproveExperience = async (experience: ExperienceItem) => {
        const bullets = experience.bullets || [];
        if (!bullets.length) return;
        if (experienceRewriteSuggestions[experience.id]?.isStreaming) return;
        const roleTitle = [experience.jobTitle, experience.company].filter(Boolean).join(" at ") || "Work experience";

        const queuedSuggestion: ExperienceRewriteSuggestion = {
            target: "experience",
            assistantMessage: "",
            experienceId: experience.id,
            roleTitle,
            isQueued: true,
            isStreaming: true,
            items: bullets.map((bullet, index) => ({
                bulletId: bullet.id,
                bulletIndex: index,
                currentText: bullet.text,
                suggestedText: "",
                reason: "",
                isQueued: true,
                isStreaming: true
            }))
        };
        setExperienceRewriteSuggestions((current) => ({
            ...current,
            [experience.id]: queuedSuggestion
        }));
        setError(null);

        bullets.forEach((bullet, index) => {
            enqueueRewriteJob(async () => {
                setLoadingExperienceImproveId(experience.id);
                updateExperienceRewriteItem(experience.id, bullet.id, (item) => ({
                    ...item,
                    isQueued: false,
                    isStreaming: true
                }));

                try {
                    const result = await streamResumeTailorSuggestion({
                        target: "experience",
                        experience_id: experience.id,
                        bullets: [{
                            id: bullet.id,
                            index,
                            text: bullet.text
                        }],
                        guidance: "Rewrite this single work-experience bullet conservatively. Use a direct action verb and cleaner phrasing when the source text supports it. Only use an XYZ-style shape when this exact bullet already contains the outcome, measure, and method. Do not use role title, company, other bullets, or resume context. Do not invent missing metrics, outcomes, tools, teams, production scope, reliability claims, customer context, or business impact. If the bullet is thin, keep the rewrite close to the original."
                    }, (event) => {
                        if (event.event === "delta" && event.target === "experience" && event.bullet_index === index && event.text !== undefined) {
                            updateExperienceRewriteItem(experience.id, bullet.id, (item) => ({
                                ...item,
                                suggestedText: event.text || "",
                                isQueued: false,
                                isStreaming: true
                            }));
                        }
                    });
                    const suggestion = (result.tailorSuggestions?.experience_bullets || [])
                        .find((item) => item.bullet_index === index && item.suggested_text?.trim());

                    if (!suggestion) {
                        removeExperienceRewriteItem(experience.id, bullet.id);
                        setError(getRewriteUserMessage(result.assistantMessage, "Jaice did not return a reviewable rewrite for one bullet. Please try again."));
                        return;
                    }

                    updateExperienceRewriteItem(experience.id, bullet.id, (item) => ({
                        ...item,
                        suggestedText: suggestion.suggested_text.trim(),
                        reason: suggestion.reason || "AI suggested a stronger work-experience bullet.",
                        isQueued: false,
                        isStreaming: false
                    }));
                } catch (err) {
                    console.error(err);
                    removeExperienceRewriteItem(experience.id, bullet.id);
                    setError(getRewriteErrorMessage(err as ApiError));
                } finally {
                    setLoadingExperienceImproveId(null);
                }
            });
        });
    };

    const markAiDraftBeforeAccept = () => {
        if (!originalResumeDataBeforeDraft) {
            setOriginalResumeDataBeforeDraft({
                ...resumeData,
                formatting: currentResumeFormatting
            });
        }
        setIsDraft(true);
    };

    const acceptSummaryRewriteSuggestion = () => {
        if (!summaryRewriteSuggestion || summaryRewriteSuggestion.isStreaming) return;
        markAiDraftBeforeAccept();

        const change: ChangeMetadata = {
            path: "summary",
            before: summaryRewriteSuggestion.currentText,
            after: summaryRewriteSuggestion.suggestedText,
            reason: summaryRewriteSuggestion.reason
        };
        setChangeMetadata(prev => [
            ...prev.filter(m => m.path !== "summary"),
            change
        ]);
        setResumeData(prev => ({
            ...prev,
            summary: summaryRewriteSuggestion.suggestedText
        }));
        setSummaryRewriteSuggestion(null);
        setRewriteActionHover(null);
        setSuccessMessage("Accepted AI summary rewrite.");
    };

    const rejectSummaryRewriteSuggestion = () => {
        if (!summaryRewriteSuggestion || summaryRewriteSuggestion.isStreaming) return;
        setSummaryRewriteSuggestion(null);
        setRewriteActionHover(null);
    };

    const acceptExperienceRewriteSuggestion = (experienceId: string, bulletId: string) => {
        const pendingRewriteSuggestion = experienceRewriteSuggestions[experienceId];
        if (!pendingRewriteSuggestion) return;

        const rewrite = pendingRewriteSuggestion.items.find((item) => item.bulletId === bulletId);
        if (!rewrite || rewrite.isStreaming) return;

        const expIndex = resumeData.experience.findIndex((item) => item.id === experienceId);
        if (expIndex < 0) {
            setError("That experience entry no longer exists.");
            setExperienceRewriteSuggestions((current) => {
                const next = { ...current };
                delete next[experienceId];
                return next;
            });
            setRewriteActionHover(null);
            return;
        }

        markAiDraftBeforeAccept();

        const change: ChangeMetadata = {
            path: `experience.${expIndex}.bullets.${rewrite.bulletIndex}`,
            before: rewrite.currentText,
            after: rewrite.suggestedText,
            reason: rewrite.reason
        };
        setChangeMetadata(prev => [
            ...prev.filter(m => m.path !== change.path),
            change
        ]);
        setResumeData(prev => ({
            ...prev,
            experience: (prev.experience || []).map((experience) => {
                if (experience.id !== experienceId) {
                    return experience;
                }
                return {
                    ...experience,
                    bullets: (experience.bullets || []).map((bullet) =>
                        bullet.id === bulletId ? { ...bullet, text: rewrite.suggestedText } : bullet
                    )
                };
            })
        }));

        setExperienceRewriteSuggestions((current) => {
            const existing = current[experienceId];
            if (!existing) return current;
            const remainingItems = existing.items.filter((item) => item.bulletId !== bulletId);
            const next = { ...current };
            if (remainingItems.length) {
                next[experienceId] = { ...existing, items: remainingItems };
            } else {
                delete next[experienceId];
            }
            return next;
        });
        setRewriteActionHover(null);
        setSuccessMessage("Accepted AI bullet rewrite.");
    };

    const rejectExperienceRewriteSuggestion = (experienceId: string, bulletId: string) => {
        const pendingRewriteSuggestion = experienceRewriteSuggestions[experienceId];
        if (!pendingRewriteSuggestion) return;
        const rewrite = pendingRewriteSuggestion.items.find((item) => item.bulletId === bulletId);
        if (!rewrite || rewrite.isStreaming) return;
        setExperienceRewriteSuggestions((current) => {
            const existing = current[experienceId];
            if (!existing) return current;
            const remainingItems = existing.items.filter((item) => item.bulletId !== bulletId);
            const next = { ...current };
            if (remainingItems.length) {
                next[experienceId] = { ...existing, items: remainingItems };
            } else {
                delete next[experienceId];
            }
            return next;
        });
        setRewriteActionHover(null);
    };

    return {
        isDraft,
        originalResumeDataBeforeDraft,
        changeMetadata,
        setChangeMetadata,
        resetDraftState,
        loadingSummaryImprove,
        loadingExperienceImproveId,
        summaryRewriteSuggestion,
        experienceRewriteSuggestions,
        rewriteActionHover,
        setRewriteActionHover,
        handleImproveSummary,
        handleImproveExperience,
        acceptSummaryRewriteSuggestion,
        rejectSummaryRewriteSuggestion,
        acceptExperienceRewriteSuggestion,
        rejectExperienceRewriteSuggestion
    };
};
