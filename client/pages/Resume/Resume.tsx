import React, { useMemo, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, apiBlob } from "@/global-services/api";
import { getIdToken } from "@/global-services/auth";
import { SearchBar } from "@/global-components/SearchBar";
import { ChatMarkdown } from "@/global-components/ChatMarkdown";
import { useSettings } from "@/pages/settings/provider/SettingsProvider";

type ResumeBullet = {
    id: string;
    text: string;
};

type ExperienceItem = {
    id: string;
    jobTitle: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets: ResumeBullet[];
};

type EducationItem = {
    id: string;
    school: string;
    degree?: string;
    startDate?: string;
    endDate?: string;
    details?: ResumeBullet[];
};

type SkillCategory = {
    id: string;
    category: string;
    items: string[];
    rawItems?: string;
};

type ContactFieldKey = "location" | "phone" | "email" | "linkedin" | "website" | "github";

type CustomContactField = {
    label: string;
    value: string;
};

type ContactRenderField =
    | {
        key: ContactFieldKey;
        value?: string;
        placeholder: string;
        isCustom: false;
    }
    | {
        key: `custom_${number}`;
        value: string;
        placeholder: string;
        isCustom: true;
        index: number;
        label: string;
    };

type ResumeData = {
    fullName: string;
    email?: string;
    phone?: string;
    location?: string;
    website?: string;
    linkedin?: string;
    github?: string;
    summary?: string;
    experience: ExperienceItem[];
    education: EducationItem[];
    skills?: SkillCategory[];
    customContact?: CustomContactField[];
    hiddenContactFields?: ContactFieldKey[];
    formatting?: ResumeFormatting;
};

type ResumeDataInput = Partial<Omit<ResumeData, "skills">> & {
    skills?: unknown;
};

type ResumeFormatting = {
    pageSize: PageSize;
    titleFontSize: number;
    headerFontSize: number;
    bodyFontSize: number;
    pageMarginPt: number;
    paperLayoutFormat: PaperLayoutFormat;
};

type SavedResume = {
    id: string;
    name: string;
    is_master: boolean;
    schema_version: number;
    source_resume_id: string | null;
    resume_data: ResumeData;
    target_job_title: string | null;
    target_job_description: string | null;
    created_at: string;
    updated_at: string;
};

type ChangeMetadata = {
    path: string;
    before: string;
    after: string;
    reason: string;
};

type ResumeChatIntent = "conversation" | "analysis" | "tailor_suggestions";

type ResumeChatMessage = {
    sender: "user" | "assistant";
    text: string;
    intent?: ResumeChatIntent;
    analysis?: ResumeChatAnalysis | null;
    tailorSuggestions?: ResumeChatTailorSuggestions | null;
};

type ResumeChatAnalysis = {
    match_score: number;
    requirements: string[];
    overlap: string[];
    gaps: string[];
    missing_keywords: string[];
    suggestions: string[];
};

type ResumeChatTailorSuggestions = {
    summary: Array<{
        current_text: string;
        suggested_text: string;
        reason: string;
    }>;
    experience_bullets: Array<{
        experience_id: string | null;
        role_title: string | null;
        bullet_index: number;
        current_text: string;
        suggested_text: string;
        reason: string;
    }>;
};

type ResumeChatStreamEvent = {
    event: "intent" | "delta" | "structured" | "error" | "done";
    intent?: ResumeChatIntent;
    text?: string;
    analysis?: ResumeChatAnalysis | null;
    tailor_suggestions?: ResumeChatTailorSuggestions | null;
    message?: string;
};

type ResumeRewriteSectionRequest = {
    target: "summary" | "experience";
    summary_text?: string;
    experience_id?: string;
    role_title?: string;
    company?: string;
    bullets?: Array<{
        id?: string;
        index: number;
        text: string;
    }>;
    guidance?: string;
};

type ResumeRewriteStreamEvent = {
    event: "delta" | "structured" | "error" | "done";
    target?: "summary" | "experience";
    bullet_index?: number | null;
    text?: string;
    assistant_message?: string;
    tailor_suggestions?: ResumeChatTailorSuggestions | null;
    message?: string;
};

type ResumeRewriteSuggestion =
    | {
        target: "summary";
        assistantMessage: string;
        currentText: string;
        suggestedText: string;
        reason: string;
        isQueued?: boolean;
        isStreaming?: boolean;
    }
    | {
        target: "experience";
        assistantMessage: string;
        experienceId: string;
        roleTitle: string;
        isQueued?: boolean;
        isStreaming?: boolean;
        items: Array<{
            bulletId: string;
            bulletIndex: number;
            currentText: string;
            suggestedText: string;
            reason: string;
            isQueued?: boolean;
            isStreaming?: boolean;
        }>;
    };

type SummaryRewriteSuggestion = Extract<ResumeRewriteSuggestion, { target: "summary" }>;
type ExperienceRewriteSuggestion = Extract<ResumeRewriteSuggestion, { target: "experience" }>;
type ExperienceRewriteItem = ExperienceRewriteSuggestion["items"][number];

type ResumeRewriteActionHover =
    | {
        target: "summary";
        action: "accept" | "reject";
    }
    | {
        target: "experience";
        bulletId: string;
        action: "accept" | "reject";
    };

type ApiError = Error & {
    status?: number;
    detail?: string;
};

const CHAT_UNAVAILABLE_MESSAGE = "The local model is not available. Confirm Ollama is running and the configured model has been pulled.";
const REWRITE_REVIEWABLE_MESSAGE = "Jaice could not generate a reviewable rewrite. Please try again.";

const stripMarkdownFormatting = (value: string) => {
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

const buildAssistantCopyText = (message: ResumeChatMessage) => {
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

const writePlainTextToClipboard = async (text: string) => {
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

type PageSize = "a4" | "letter";
type ZoomMode = "fit" | "manual";
type DocumentSectionId = "header" | "summary" | "experience" | "education" | "skills";
type PaperLayoutFormat = "compact" | "standard" | "relaxed";
type FontPreviewTarget = "title" | "header" | "body";

const SECTION_GAP_PX: Record<PaperLayoutFormat, number> = {
    compact: 6,
    standard: 10,
    relaxed: 16
};

type PaperMetrics = {
    label: string;
    standardLabel: string;
    width: number;
    height: number;
    printName: string;
    dimensionLabel: {
        width: string;
        height: string;
    };
};

const PAPER_SIZES: Record<PageSize, PaperMetrics> = {
    a4: {
        label: "A4",
        standardLabel: "Europe, Asia, etc.",
        width: 794,
        height: 1123,
        printName: "A4",
        dimensionLabel: {
            width: "210 mm",
            height: "297 mm"
        }
    },
    letter: {
        label: "Letter",
        standardLabel: "US & Canada",
        width: 816,
        height: 1056,
        printName: "Letter",
        dimensionLabel: {
            width: "8.5 in",
            height: "11 in"
        }
    }
};

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.4;
const ZOOM_STEP = 0.1;
const MIN_FIT_ZOOM = 0.25;

const makeId = () => Math.random().toString(36).slice(2, 10);

const clampZoom = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
const clampFitZoom = (value: number) => Math.min(1, Math.max(MIN_FIT_ZOOM, value));
const hasText = (value: unknown) => String(value ?? "").trim().length > 0;

const parseSkillItems = (input: string): string[] => {
    return input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

const normalizeTextList = (items: unknown): string[] => {
    if (!Array.isArray(items)) return [];
    return items
        .map((item) => String(item || "").trim())
        .filter(Boolean);
};

const formatSkillItemsForInput = (items: unknown): string => normalizeTextList(items).join(", ");

const getSkillItemsText = (skill: Partial<SkillCategory> | null | undefined): string => {
    return typeof skill?.rawItems === "string" ? skill.rawItems : formatSkillItemsForInput(skill?.items);
};

const defaultSkillCategories = (): SkillCategory[] => [
    { id: makeId(), category: "Languages", items: ["Python", "TypeScript", "Go"] },
    { id: makeId(), category: "Frameworks", items: ["FastAPI", "React", "Next.js"] },
    { id: makeId(), category: "Cloud/DevOps", items: ["AWS", "Docker", "Kubernetes", "PostgreSQL"] },
    { id: makeId(), category: "Tools", items: ["Git", "Kafka", "Jest"] }
];

const normalizeSkillCategories = (skills: unknown): SkillCategory[] => {
    if (!Array.isArray(skills)) return [];

    if (skills.every((skill) => typeof skill === "string")) {
        const items = normalizeTextList(skills);
        return items.length ? [{ id: "skills-default", category: "Skills", items, rawItems: formatSkillItemsForInput(items) }] : [];
    }

    return skills
        .map((skill, index): SkillCategory | null => {
            const category = skill && typeof skill === "object" ? skill as Partial<SkillCategory> : null;
            if (!category) return null;
            const rawItems = getSkillItemsText(category);
            const items = parseSkillItems(rawItems);
            const normalizedCategory = String(category?.category ?? "Skills").trim();

            if (!normalizedCategory && items.length === 0) return null;

            return {
                id: String(category?.id || `skills-${index}`),
                category: normalizedCategory,
                items,
                rawItems
            };
        })
        .filter((skill): skill is SkillCategory => Boolean(skill));
};

const getTextStats = (text?: string) => {
    const value = text || "";
    return {
        chars: value.length,
        words: value.split(/\s+/).filter(Boolean).length
    };
};

const defaultResumeFormatting = (): ResumeFormatting => ({
    pageSize: "a4",
    titleFontSize: 24,
    headerFontSize: 16,
    bodyFontSize: 12,
    pageMarginPt: 42,
    paperLayoutFormat: "standard"
});

const defaultResumeData = (): ResumeData => ({
    fullName: "ALEXANDER WRIGHT",
    email: "alexander.wright@email.com",
    phone: "(555) 342-8910",
    location: "San Francisco, CA",
    website: "https://alexwright.dev",
    linkedin: "linkedin.com/in/alexwright",
    github: "github.com/alexwright",
    summary: "Strategic and results-driven Software Architect with 8+ years of experience pioneering distributed systems, cloud migrations, and high-performance microservices. Adept at steering cross-functional engineering teams to accelerate feature delivery, minimize latency, and de-risk core technical milestones.",
    experience: [
        {
            id: makeId(),
            jobTitle: "Lead Software Architect",
            company: "Sentry Systems",
            location: "San Francisco, CA",
            startDate: "Mar 2021",
            endDate: "Present",
            bullets: [
                { id: makeId(), text: "Engineered high-throughput event streaming architecture using Python, Kafka, and FastAPI, slashing endpoint latency by 35% and increasing data ingestion capacity to 10M+ daily events." },
                { id: makeId(), text: "Spearheaded the migration of legacy monolithic architecture to scalable Kubernetes clusters, saving over $240K annually in infrastructure overhead while guaranteeing 99.99% system availability." },
                { id: makeId(), text: "Pioneered cross-functional design sprints and technical roadmap outlines, de-risking three consecutive quarterly releases and improving team sprint velocity by 25%." }
            ]
        }
    ],
    education: [
        {
            id: makeId(),
            school: "University of California, Berkeley",
            degree: "M.S. Computer Science & Engineering",
            startDate: "Sep 2016",
            endDate: "Jun 2018",
            details: []
        }
    ],
    skills: defaultSkillCategories(),
    customContact: [],
    hiddenContactFields: [],
    formatting: defaultResumeFormatting()
});

const normalizeResumeData = (data?: ResumeDataInput | string | null): ResumeData => {
    let parsed: any = data;
    if (typeof data === "string") {
        try {
            parsed = JSON.parse(data);
        } catch (e) {
            console.error("Failed to parse resume_data string:", e);
        }
    }
    return {
        fullName: parsed?.fullName || "",
        email: parsed?.email || "",
        phone: parsed?.phone || "",
        location: parsed?.location || "",
        website: parsed?.website || "",
        linkedin: parsed?.linkedin || "",
        github: parsed?.github || "",
        summary: parsed?.summary || "",
        experience: Array.isArray(parsed?.experience)
            ? parsed.experience.map((exp: ExperienceItem) => ({
                ...exp,
                bullets: Array.isArray(exp.bullets)
                    ? exp.bullets.filter((bullet) => String(bullet.text || "").trim())
                    : []
            }))
            : [],
        education: Array.isArray(parsed?.education)
            ? parsed.education.map((ed: EducationItem) => ({
                ...ed,
                details: Array.isArray(ed.details)
                    ? ed.details.filter((detail) => hasText(detail.text))
                    : []
            }))
            : [],
        skills: normalizeSkillCategories(parsed?.skills),
        customContact: Array.isArray(parsed?.customContact) ? parsed.customContact : [],
        hiddenContactFields: Array.isArray(parsed?.hiddenContactFields)
            ? parsed.hiddenContactFields.filter((field: string): field is ContactFieldKey =>
                ["location", "phone", "email", "linkedin", "website", "github"].includes(field)
            )
            : [],
        formatting: normalizeResumeFormatting(parsed?.formatting)
    };
};

const normalizeSkillCategoriesForPayload = (skills: unknown): SkillCategory[] => {
    return normalizeSkillCategories(skills)
        .map((skill) => {
            return {
                id: skill.id,
                category: skill.category,
                items: parseSkillItems(getSkillItemsText(skill))
            };
        })
        .filter((skill) => hasText(skill.category) || skill.items.length > 0);
};

const normalizeResumeDataForPayload = (data?: ResumeDataInput | string | null): ResumeData => {
    const normalized = normalizeResumeData(data);
    return {
        ...normalized,
        education: (normalized.education || []).map((ed) => ({
            ...ed,
            details: Array.isArray(ed.details)
                ? ed.details.filter((detail) => hasText(detail.text))
                : []
        })),
        skills: normalizeSkillCategoriesForPayload(normalized.skills)
    };
};

const normalizeResumeFormatting = (formatting?: Partial<ResumeFormatting> | null): ResumeFormatting => {
    const defaults = defaultResumeFormatting();
    const pageSize = formatting?.pageSize === "letter" || formatting?.pageSize === "a4" ? formatting.pageSize : defaults.pageSize;
    const paperLayoutFormat =
        formatting?.paperLayoutFormat === "compact" || formatting?.paperLayoutFormat === "standard" || formatting?.paperLayoutFormat === "relaxed"
            ? formatting.paperLayoutFormat
            : defaults.paperLayoutFormat;

    return {
        pageSize,
        titleFontSize: clampNumberValue(formatting?.titleFontSize, 18, 34, defaults.titleFontSize),
        headerFontSize: clampNumberValue(formatting?.headerFontSize, 12, 22, defaults.headerFontSize),
        bodyFontSize: clampNumberValue(formatting?.bodyFontSize, 9, 15, defaults.bodyFontSize),
        pageMarginPt: clampNumberValue(formatting?.pageMarginPt, 24, 60, defaults.pageMarginPt),
        paperLayoutFormat
    };
};

const clampNumberValue = (value: unknown, min: number, max: number, fallback: number) => {
    const numberValue = typeof value === "number" && Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(min, numberValue));
};

const AutoResizeTextarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }
>(({ value, className, onChange, ...props }, ref) => {
    const localRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = localRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        // Calculate the exact border height to prevent scrollHeight border-box clipping.
        // Falls back to 2px if the element is not currently visible in the layout.
        const borderHeight = (textarea.offsetHeight - textarea.clientHeight) || 2;
        textarea.style.height = `${textarea.scrollHeight + borderHeight}px`;
    };

    // Use useLayoutEffect to run adjustHeight synchronously after every render
    // to ensure React's virtual DOM reconciliation doesn't wipe out the height style.
    React.useLayoutEffect(() => {
        adjustHeight();
    });

    // Add window resize listener
    useEffect(() => {
        const handleResize = () => adjustHeight();
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <textarea
            {...props}
            ref={(el) => {
                localRef.current = el;
                if (typeof ref === "function") {
                    ref(el);
                } else if (ref) {
                    (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
                }
            }}
            rows={1}
            value={value}
            onChange={onChange}
            onInput={(e) => {
                props.onInput?.(e);
                adjustHeight();
            }}
            onFocus={(e) => {
                props.onFocus?.(e);
                adjustHeight();
            }}
            onMouseEnter={(e) => {
                props.onMouseEnter?.(e);
                adjustHeight();
            }}
            className={className}
        />
    );
});
AutoResizeTextarea.displayName = "AutoResizeTextarea";

type OverlayInputProps = {
    path: string;
    label: string;
    value: string;
    placeholder: string;
    className: string;
    style?: React.CSSProperties;
    onChange: (val: string) => void;
    onDelete?: () => void;
    onCustomAction?: () => void;
    customActionTitle?: string;
    customActionIcon?: React.ReactNode;
    isAutoResize?: boolean;
    showTextStats?: boolean;
    customActionPlacement?: "tray" | "left" | "right";
    disableClear?: boolean;
    disableDelete?: boolean;
    containerClassName?: string;
    inputContainerClassName?: string;
    hoveredField: string | null;
    setHoveredField: React.Dispatch<React.SetStateAction<string | null>>;
    focusedField: string | null;
    setFocusedField: React.Dispatch<React.SetStateAction<string | null>>;
};

const OverlayInput: React.FC<OverlayInputProps> = ({
    path,
    label: _label,
    value,
    placeholder,
    className,
    style,
    onChange,
    onDelete,
    onCustomAction,
    customActionTitle,
    customActionIcon,
    isAutoResize,
    showTextStats: shouldShowTextStats = false,
    customActionPlacement = "tray",
    disableClear = false,
    disableDelete = false,
    containerClassName = "",
    inputContainerClassName = "",
    hoveredField,
    setHoveredField,
    focusedField,
    setFocusedField
}) => {
    const isOpen = hoveredField === path || focusedField === path;
    const fluidEase = [0.32, 0.72, 0.32, 1] as [number, number, number, number];
    const [isClearHovered, setIsClearHovered] = useState(false);
    const [isDeleteHovered, setIsDeleteHovered] = useState(false);
    
    const InputComp = isAutoResize ? AutoResizeTextarea : "input";
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const showInlineClear = isOpen && Boolean(value) && !disableClear;
    const showInlineDelete = isOpen && Boolean(onDelete) && !disableDelete;
    const showLeftCustomAction = isOpen && customActionPlacement === "left" && Boolean(onCustomAction && customActionIcon);
    const showRightCustomAction = isOpen && customActionPlacement === "right" && Boolean(onCustomAction && customActionIcon);
    const showTextStats = shouldShowTextStats && hoveredField === path;
    const textStats = showTextStats ? getTextStats(value) : null;
    const buttonsActive = showRightCustomAction || showInlineClear || showInlineDelete;
    let buttonsEnd = 0;
    if (showInlineDelete) {
        buttonsEnd = (showRightCustomAction ? 24 : 0) + (showInlineClear ? 24 : 4) + 16;
    } else if (showInlineClear) {
        buttonsEnd = (showRightCustomAction ? 24 : 4) + 16;
    } else if (showRightCustomAction) {
        buttonsEnd = 4 + 16;
    }
    const overlayRightPad = isOpen ? (buttonsActive ? buttonsEnd + 8 : 2) : 0;

    useEffect(() => {
        if (focusedField === path && inputRef.current && document.activeElement !== inputRef.current) {
            inputRef.current.focus();
            if ('selectionStart' in inputRef.current) {
                const len = value.length;
                inputRef.current.selectionStart = len;
                inputRef.current.selectionEnd = len;
            }
        }
    }, [focusedField, path, value]);
    
    return (
        <motion.div
            className={`overlay-meta-field relative flex flex-col items-stretch ${containerClassName}`}
            data-open={isOpen}
            onHoverStart={() => setHoveredField(path)}
            onHoverEnd={() => setHoveredField(current => current === path ? null : current)}
            animate={{
                paddingTop: isOpen ? 2 : 0,
                paddingRight: overlayRightPad,
                paddingBottom: isOpen ? 1 : 0,
                paddingLeft: isOpen ? (showLeftCustomAction ? 30 : 2) : 0,
                marginTop: isOpen ? -2 : 0,
                marginRight: -overlayRightPad,
                marginBottom: isOpen ? -1 : 0,
                marginLeft: isOpen ? (showLeftCustomAction ? -30 : -2) : 0,
                backgroundColor: isOpen ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 255, 255, 0)",
                borderTopLeftRadius: isOpen ? 5 : 4,
                borderTopRightRadius: isOpen ? 5 : 4,
                borderBottomLeftRadius: isOpen ? 5 : 4,
                borderBottomRightRadius: isOpen ? 5 : 4,
                boxShadow: isOpen
                    ? isDeleteHovered
                        ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #dc2626"
                        : "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(14, 165, 233, 0.35)"
                    : "0 0px 0px rgba(0,0,0,0), 0 0 0 0px rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.28, ease: fluidEase }}
            style={{
                transformOrigin: "center",
                zIndex: isOpen ? 80 : 0,
                backdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none",
                WebkitBackdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none"
            }}
        >
            <div className={`relative flex min-w-0 items-center ${inputContainerClassName}`}>
                {showLeftCustomAction && (
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onCustomAction}
                        className="resume-edit-control absolute right-full top-1/2 z-10 mr-1 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-black opacity-75 shadow-none transition-[background,color,opacity] hover:!bg-black/10 hover:text-black hover:opacity-100"
                        title={customActionTitle}
                        aria-label={customActionTitle}
                    >
                        {customActionIcon}
                    </button>
                )}
                <InputComp
                    ref={inputRef as any}
                    className={`${className} overlay-item-input resume-body-font-target`}
                    value={value}
                    onChange={(e: any) => onChange(e.target.value)}
                    onFocus={() => setFocusedField(path)}
                    onBlur={() => setFocusedField(current => current === path ? null : current)}
                    placeholder={placeholder}
                    style={{
                        ...style,
                        color: isOpen ? (isDeleteHovered ? "#dc2626" : isClearHovered ? "#94a3b8" : "black") : style?.color,
                        opacity: isClearHovered ? 0.55 : style?.opacity,
                        textDecoration: isDeleteHovered ? "line-through" : isClearHovered ? "line-through" : style?.textDecoration,
                        textDecorationColor: isDeleteHovered ? "#dc2626" : isClearHovered ? "#94a3b8" : style?.textDecorationColor,
                        borderRadius: isOpen ? 4 : undefined,
                        transition: "color 150ms ease, opacity 150ms ease, text-decoration 150ms ease, text-decoration-color 150ms ease"
                    }}
                />
                {(showRightCustomAction || showInlineClear || showInlineDelete) && (
                    <div
                        className="pointer-events-none absolute left-full top-1/2 z-10 h-4 w-px -translate-y-1/2 bg-black/15"
                        style={{ marginLeft: -1 }}
                    />
                )}
                {showRightCustomAction && (
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onCustomAction}
                        className="resume-edit-control absolute left-full top-1/2 z-10 ml-1 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-black opacity-75 shadow-none transition-[background,color,opacity] hover:!bg-black/10 hover:text-black hover:opacity-100"
                        title={customActionTitle}
                        aria-label={customActionTitle}
                    >
                        {customActionIcon}
                    </button>
                )}
                {showInlineClear && (
                    <button
                        type="button"
                        onMouseEnter={() => setIsClearHovered(true)}
                        onMouseLeave={() => setIsClearHovered(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onChange("")}
                        className="resume-edit-control absolute left-full top-1/2 z-10 ml-1 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-black opacity-70 shadow-none transition-[background,color,opacity] hover:!bg-black/10 hover:text-black hover:opacity-100"
                        style={{ marginLeft: showRightCustomAction ? 24 : 4 }}
                        title="Clear field"
                        aria-label="Clear field"
                    >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
                {showInlineDelete && (
                    <button
                        type="button"
                        onMouseEnter={() => setIsDeleteHovered(true)}
                        onMouseLeave={() => setIsDeleteHovered(false)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onDelete}
                        className="resume-edit-control absolute left-full top-1/2 z-10 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-[#f87171] opacity-80 shadow-none transition-[background,color,opacity] hover:!bg-red-500/15 hover:text-[#f87171] hover:opacity-100"
                        style={{ marginLeft: (showRightCustomAction ? 24 : 0) + (showInlineClear ? 24 : 4) }}
                        title="Delete"
                        aria-label="Delete field"
                    >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2.75" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                        </svg>
                    </button>
                )}
            </div>
            {showTextStats && textStats && (
                <div
                    className="resume-text-stat-pill pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-200 shadow-[0_10px_24px_rgba(2,6,23,0.30),inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                    {textStats.chars} chars • {textStats.words} words
                </div>
            )}
            <AnimatePresence initial={false}>
                {isOpen && customActionPlacement === "tray" && onCustomAction && (
                    <motion.div
                        key="tray"
                        className="overlay-trash-tray resume-edit-control absolute left-1/2 w-max -translate-x-1/2"
                        style={{
                            top: "100%",
                            zIndex: 90,
                            background: "rgba(255, 255, 255, 0.94)",
                            borderTop: "0",
                            borderLeft: "0",
                            borderRight: "0",
                            borderBottom: "0",
                            borderRadius: "0 0 12px 12px",
                            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(14, 165, 233, 0.35)",
                            transformOrigin: "top center",
                            backdropFilter: "blur(22px) saturate(160%)",
                            WebkitBackdropFilter: "blur(22px) saturate(160%)"
                        }}
                        initial={{ opacity: 0, y: -8, scaleY: 0.94 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -8, scaleY: 0.94 }}
                        transition={{ duration: 0.28, ease: fluidEase }}
                    >
                        <div className="flex items-center justify-end gap-1 px-1.5 py-0.5 text-xs text-slate-700 font-medium h-6">
                            {onCustomAction && customActionIcon && (
                                <button
                                    type="button"
                                    onClick={onCustomAction}
                                    className="!inline-flex !h-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 opacity-75 transition-[background,border-color,color,opacity,transform] duration-200 active:scale-95 hover:!bg-slate-500/10 hover:!border-slate-400/20 hover:opacity-100 cursor-pointer"
                                    style={{ color: "#475569" }}
                                    title={customActionTitle}
                                >
                                    {customActionIcon}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

type DocumentSectionProps = {
    id: DocumentSectionId;
    activeSection: DocumentSectionId | null;
    setActiveSection: React.Dispatch<React.SetStateAction<DocumentSectionId | null>>;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    showGapPreview?: boolean;
    gapPreviewHeight?: number;
    title?: string;
};

const DocumentSection: React.FC<DocumentSectionProps> = ({
    id,
    activeSection,
    setActiveSection,
    children,
    className = "",
    style,
    showGapPreview = false,
    gapPreviewHeight = 0,
    title
}) => {
    const isActive = activeSection === id;

    return (
            <section
                className={`document-hover-section relative box-border w-full ${className}`}
                data-section={id}
                data-active={isActive}
                title={title}
                style={style}
            onMouseEnter={() => setActiveSection(id)}
            onMouseLeave={() => setActiveSection((current) => current === id ? null : current)}
        >
            <div className="document-hover-section-border pointer-events-none absolute z-[1] rounded-sm opacity-0 transition-opacity duration-150" />
            <div className="relative z-[2]">
                {children}
            </div>
            {showGapPreview && gapPreviewHeight > 0 && (
                <div
                    className="resume-section-gap-preview"
                    style={{
                        height: `${gapPreviewHeight}px`,
                        bottom: `-${gapPreviewHeight}px`
                    }}
                />
            )}
        </section>
    );
};

const ShelfMinusIcon = () => (
    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
);

const ShelfPlusIcon = () => (
    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
);

type ResumePrintDocumentProps = {
    resumeData: ResumeData;
    formatting: ResumeFormatting;
};

const ResumePrintDocument: React.FC<ResumePrintDocumentProps> = ({ resumeData, formatting }) => {
    const paper = PAPER_SIZES[formatting.pageSize];
    const pageWidth = formatting.pageSize === "a4" ? "210mm" : "8.5in";
    const pageHeight = formatting.pageSize === "a4" ? "297mm" : "11in";
    const sectionGap = SECTION_GAP_PX[formatting.paperLayoutFormat] ?? SECTION_GAP_PX.standard;
    const hiddenContactFields = new Set(resumeData.hiddenContactFields || []);
    const contactItems = [
        !hiddenContactFields.has("location") ? resumeData.location : "",
        !hiddenContactFields.has("phone") ? resumeData.phone : "",
        !hiddenContactFields.has("email") ? resumeData.email : "",
        !hiddenContactFields.has("linkedin") ? resumeData.linkedin : "",
        !hiddenContactFields.has("website") ? resumeData.website : "",
        !hiddenContactFields.has("github") ? resumeData.github : "",
        ...(resumeData.customContact || []).map((field) => field.value)
    ].map((item) => String(item || "").trim()).filter(Boolean);
    const contactRows = [];
    for (let i = 0; i < contactItems.length; i += 3) {
        contactRows.push(contactItems.slice(i, i + 3));
    }

    const sectionStyle: React.CSSProperties = {
        marginBottom: sectionGap,
        textAlign: "left",
        width: "100%"
    };
    const headingStyle: React.CSSProperties = {
        fontSize: formatting.headerFontSize,
        lineHeight: 1.1,
        margin: "0 0 4px",
        paddingBottom: 2,
        borderBottom: "1px solid #cbd5e1",
        fontFamily: "var(--font-title)",
        fontWeight: 700,
        letterSpacing: 0,
        textTransform: "uppercase",
        color: "#0f172a",
        textAlign: "left"
    };
    const bodyTextStyle: React.CSSProperties = {
        fontSize: formatting.bodyFontSize,
        lineHeight: 1.38,
        color: "#334155",
        fontFamily: "var(--font-body)",
        textAlign: "left"
    };
    const metaTextStyle: React.CSSProperties = {
        fontSize: formatting.bodyFontSize,
        lineHeight: 1.25,
        fontFamily: "var(--font-subheading)",
        color: "#475569",
        textAlign: "left"
    };

    return (
        <div
            id="resume-print-document"
            aria-hidden="true"
            style={{
                width: pageWidth,
                height: pageHeight,
                padding: `${formatting.pageMarginPt}pt`,
                boxSizing: "border-box",
                background: "#ffffff",
                color: "#0f172a",
                fontFamily: "var(--font-body)",
                fontSize: formatting.bodyFontSize,
                textAlign: "left"
            }}
            data-print-page={paper.printName}
        >
            <section style={sectionStyle}>
                <h1
                    style={{
                        margin: "0 0 6px",
                        textAlign: "center",
                        fontSize: formatting.titleFontSize,
                        lineHeight: 1,
                        fontFamily: "var(--font-body)",
                        fontWeight: 700,
                        color: "#0f172a"
                    }}
                >
                    {resumeData.fullName || "Your Name"}
                </h1>
                {contactRows.length > 0 && (
                    <div
                        style={{
                            ...metaTextStyle,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 3,
                            textAlign: "center"
                        }}
                    >
                        {contactRows.map((row, rowIndex) => (
                            <div key={`contact-row-${rowIndex}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                                {row.map((item, index) => (
                                    <React.Fragment key={`${item}-${index}`}>
                                        {index > 0 && <span style={{ color: "#cbd5e1" }}>&bull;</span>}
                                        <span>{item}</span>
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {resumeData.summary && (
                <section style={sectionStyle}>
                    <h2 style={headingStyle}>Professional Summary</h2>
                    <p style={{ ...bodyTextStyle, margin: 0 }}>{resumeData.summary}</p>
                </section>
            )}

            {(resumeData.experience || []).some((exp) =>
                hasText(exp.jobTitle) ||
                hasText(exp.company) ||
                hasText(exp.location) ||
                hasText(exp.startDate) ||
                hasText(exp.endDate) ||
                (exp.bullets || []).some((bullet) => hasText(bullet.text))
            ) && (
                <section style={sectionStyle}>
                    <h2 style={headingStyle}>Work Experience</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(resumeData.experience || [])
                            .filter((exp) =>
                                hasText(exp.jobTitle) ||
                                hasText(exp.company) ||
                                hasText(exp.location) ||
                                hasText(exp.startDate) ||
                                hasText(exp.endDate) ||
                                (exp.bullets || []).some((bullet) => hasText(bullet.text))
                            )
                            .map((exp) => {
                            const metaFields = [
                                { value: exp.jobTitle, strong: true },
                                { value: exp.company, strong: true },
                                { value: exp.location, strong: true },
                            ].filter((field) => hasText(field.value));
                            const dateFields = [exp.startDate, exp.endDate].filter(hasText);
                            return (
                            <article key={exp.id}>
                                <div
                                    style={{
                                        ...metaTextStyle,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "baseline",
                                        gap: 16,
                                        marginBottom: 6,
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
                                        {metaFields.map((field, index) => (
                                            <React.Fragment key={`${field.value}-${index}`}>
                                                {index > 0 && <span style={{ color: "#cbd5e1", flexShrink: 0 }}>|</span>}
                                                <strong style={{ color: index === 0 ? "#0f172a" : undefined, flexShrink: 0 }}>{field.value}</strong>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    {dateFields.length > 0 && (
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
                                            {dateFields.map((date, index) => (
                                                <React.Fragment key={`${date}-${index}`}>
                                                    {index > 0 && <span style={{ color: "#cbd5e1" }}>-</span>}
                                                    <span>{date}</span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {(exp.bullets || []).some((bullet) => hasText(bullet.text)) && (
                                    <ul
                                        style={{
                                            ...bodyTextStyle,
                                            margin: "0 0 0 18px",
                                            padding: 0,
                                            listStyleType: "disc",
                                            listStylePosition: "outside"
                                        }}
                                    >
                                        {(exp.bullets || []).filter((bullet) => hasText(bullet.text)).map((bullet) => (
                                            <li key={bullet.id} style={{ display: "list-item", marginBottom: 4, paddingLeft: 4, textAlign: "left" }}>
                                                {bullet.text}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </article>
                            );
                        })}
                    </div>
                </section>
            )}

            {(resumeData.education || []).some((ed) =>
                hasText(ed.degree) ||
                hasText(ed.school) ||
                hasText(ed.startDate) ||
                hasText(ed.endDate) ||
                (ed.details || []).some((detail) => hasText(detail.text))
            ) && (
                <section style={sectionStyle}>
                    <h2 style={headingStyle}>Education</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(resumeData.education || [])
                            .filter((ed) =>
                                hasText(ed.degree) ||
                                hasText(ed.school) ||
                                hasText(ed.startDate) ||
                                hasText(ed.endDate) ||
                                (ed.details || []).some((detail) => hasText(detail.text))
                            )
                            .map((ed) => {
                            const metaFields = [ed.degree, ed.school].filter(hasText);
                            const dateFields = [ed.startDate, ed.endDate].filter(hasText);
                            const details = (ed.details || []).filter((detail) => hasText(detail.text));
                            return (
                            <div key={ed.id}>
                                <div
                                    style={{
                                        ...metaTextStyle,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "baseline",
                                        gap: 16,
                                        whiteSpace: "nowrap"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
                                        {metaFields.map((field, index) => (
                                            <React.Fragment key={`${field}-${index}`}>
                                                {index > 0 && <span style={{ color: "#cbd5e1", flexShrink: 0 }}>|</span>}
                                                <strong style={{ color: index === 0 ? "#0f172a" : undefined, flexShrink: 0 }}>{field}</strong>
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    {dateFields.length > 0 && (
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
                                            {dateFields.map((date, index) => (
                                                <React.Fragment key={`${date}-${index}`}>
                                                    {index > 0 && <span style={{ color: "#cbd5e1" }}>-</span>}
                                                    <span>{date}</span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {details.length > 0 && (
                                    <ul style={{ ...bodyTextStyle, margin: "3px 0 0 18px", padding: 0, listStyleType: "disc", listStylePosition: "outside" }}>
                                        {details.map((detail) => (
                                            <li key={detail.id} style={{ display: "list-item", marginBottom: 3, paddingLeft: 4, textAlign: "left" }}>
                                                {detail.text}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {(resumeData.skills || []).some((skill) => hasText(skill.category) || (skill.items || []).some(hasText)) && (
                <section>
                    <h2 style={headingStyle}>Skills</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {(resumeData.skills || [])
                            .filter((skill) => hasText(skill.category) || (skill.items || []).some(hasText))
                            .map((skill) => (
                                <div key={skill.id} style={{ ...bodyTextStyle, display: "flex", alignItems: "baseline", justifyContent: "flex-start", gap: 8 }}>
                                    {hasText(skill.category) && <strong style={{ minWidth: 88, flexShrink: 0, color: "#0f172a", textAlign: "left" }}>{skill.category}</strong>}
                                    {hasText(skill.category) && (skill.items || []).some(hasText) && <span style={{ flexShrink: 0, fontWeight: 700, color: "#0f172a" }}>:</span>}
                                    <span style={{ minWidth: 0 }}>{(skill.items || []).filter(hasText).join(", ")}</span>
                                </div>
                            ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export function Resume() {
    const { theme } = useSettings();
    const isLightMode = theme === "light";

    // ---------- State ----------
    const [resumesList, setResumesList] = useState<SavedResume[]>([]);
    const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
    const [resumeName, setResumeName] = useState("Primary Resume");
    const [isMaster, setIsMaster] = useState(false);
    const [resumeData, setResumeData] = useState<ResumeData>(defaultResumeData());

    // Volatile tailored draft states (Phase 4)
    const [isDraft, setIsDraft] = useState(false);
    const [originalResumeDataBeforeDraft, setOriginalResumeDataBeforeDraft] = useState<ResumeData | null>(null);
    const [changeMetadata, setChangeMetadata] = useState<ChangeMetadata[]>([]);



    // Chat & LLM Integration states
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
    const rewriteQueueRef = useRef<Promise<void>>(Promise.resolve());
    const [isChatInputCollapsed, setIsChatInputCollapsed] = useState(false);
    const [showBackToBottom, setShowBackToBottom] = useState(false);
    const [isChatResponding, setIsChatResponding] = useState(false);
    const [copiedChatMessageIndex, setCopiedChatMessageIndex] = useState<number | null>(null);

    // Sidebar & UI States
    const [showCloneModal, setShowCloneModal] = useState(false);
    const [dontAskClone, setDontAskClone] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loadingList, setLoadingList] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [loadingPdfExport, setLoadingPdfExport] = useState(false);
    const [hoveredDeleteIndex, setHoveredDeleteIndex] = useState<string | null>(null);
    const [hoveredContactField, setHoveredContactField] = useState<string | null>(null);
    const [focusedContactField, setFocusedContactField] = useState<string | null>(null);
    const [hoveredNameSection, setHoveredNameSection] = useState(false);
    const [focusedNameSection, setFocusedNameSection] = useState(false);
    const [hoveredSummary, setHoveredSummary] = useState(false);
    const [focusedSummary, setFocusedSummary] = useState(false);
    const [loadingSummaryImprove, setLoadingSummaryImprove] = useState(false);
    const [isSummaryImproveHovered, setIsSummaryImproveHovered] = useState(false);
    const [hoveredField, setHoveredField] = useState<string | null>(null);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
    const [loadingExperienceImproveId, setLoadingExperienceImproveId] = useState<string | null>(null);
    const [hoveredExperienceImproveId, setHoveredExperienceImproveId] = useState<string | null>(null);
    const [hoveredExperienceClearId, setHoveredExperienceClearId] = useState<string | null>(null);
    const [hoveredExperienceDeleteId, setHoveredExperienceDeleteId] = useState<string | null>(null);
    const [hoveredEducationDeleteId, setHoveredEducationDeleteId] = useState<string | null>(null);
    const [hoveredSkillDeleteId, setHoveredSkillDeleteId] = useState<string | null>(null);
    const [activeDocumentSection, setActiveDocumentSection] = useState<DocumentSectionId | null>(null);
    const [summaryRewriteSuggestion, setSummaryRewriteSuggestion] = useState<SummaryRewriteSuggestion | null>(null);
    const [experienceRewriteSuggestions, setExperienceRewriteSuggestions] = useState<Record<string, ExperienceRewriteSuggestion>>({});
    const [rewriteActionHover, setRewriteActionHover] = useState<ResumeRewriteActionHover | null>(null);

    // Tracks if active resume has changes unsaved
    const [isDirty, setIsDirty] = useState(false);

    // UI state for search queries and rail collapse toggles
    const [isLeftRailCollapsed, setIsLeftRailCollapsed] = useState(false);
    const [isRightRailCollapsed, setIsRightRailCollapsed] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [resumeSearchFocusSignal] = useState(0);
    const canvasViewportRef = useRef<HTMLDivElement>(null);
    const [canvasViewportSize, setCanvasViewportSize] = useState({ width: 0, height: 0 });
    const [pageSize, setPageSize] = useState<PageSize>(defaultResumeFormatting().pageSize);
    const [zoomMode, setZoomMode] = useState<ZoomMode>("manual");
    const [manualZoom, setManualZoom] = useState(1);
    const [animatedCanvasZoom, setAnimatedCanvasZoom] = useState(1);
    const [isPageStyleShelfOpen, setIsPageStyleShelfOpen] = useState(false);
    const [titleFontSize, setTitleFontSize] = useState(defaultResumeFormatting().titleFontSize);
    const [headerFontSize, setHeaderFontSize] = useState(defaultResumeFormatting().headerFontSize);
    const [bodyFontSize, setBodyFontSize] = useState(defaultResumeFormatting().bodyFontSize);
    const [pageMarginPt, setPageMarginPt] = useState(defaultResumeFormatting().pageMarginPt);
    const [paperLayoutFormat, setPaperLayoutFormat] = useState<PaperLayoutFormat>(defaultResumeFormatting().paperLayoutFormat);
    const [fontPreviewTarget, setFontPreviewTarget] = useState<FontPreviewTarget | null>(null);
    const [isMarginPreviewVisible, setIsMarginPreviewVisible] = useState(false);
    const [isPageFormatPreviewVisible, setIsPageFormatPreviewVisible] = useState(false);
    const [isSectionGapPreviewVisible, setIsSectionGapPreviewVisible] = useState(false);

    const getCurrentResumeFormatting = (): ResumeFormatting => ({
        pageSize,
        titleFontSize,
        headerFontSize,
        bodyFontSize,
        pageMarginPt,
        paperLayoutFormat
    });

    const applyResumeFormatting = (formatting?: Partial<ResumeFormatting> | null) => {
        const normalizedFormatting = normalizeResumeFormatting(formatting);
        setPageSize(normalizedFormatting.pageSize);
        setTitleFontSize(normalizedFormatting.titleFontSize);
        setHeaderFontSize(normalizedFormatting.headerFontSize);
        setBodyFontSize(normalizedFormatting.bodyFontSize);
        setPageMarginPt(normalizedFormatting.pageMarginPt);
        setPaperLayoutFormat(normalizedFormatting.paperLayoutFormat);
    };

    // Fetch resumes on mount
    useEffect(() => {
        fetchResumes();
    }, []);

    // Auto-dismiss success message after 4 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Auto-dismiss error message after 8 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setError(null);
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        return () => {
            if (copyStatusTimeoutRef.current !== null) {
                window.clearTimeout(copyStatusTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const container = canvasViewportRef.current;
        if (!container) return;

        const updateViewportSize = () => {
            setCanvasViewportSize({
                width: container.clientWidth,
                height: container.clientHeight
            });
        };

        updateViewportSize();

        const observer = new ResizeObserver(updateViewportSize);
        observer.observe(container);
        window.addEventListener("resize", updateViewportSize);

        return () => {
            observer.disconnect();
            window.removeEventListener("resize", updateViewportSize);
        };
    }, []);

    // Scroll chat thread to bottom
    useEffect(() => {
        if (chatContainerRef.current) {
            const container = chatContainerRef.current;
            const lastMsg = chatMessages[chatMessages.length - 1];
            // Always scroll to bottom if the last message is from the user,
            // or if the user is currently at the bottom (showBackToBottom is false)
            if (!lastMsg || lastMsg.sender === "user" || !showBackToBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [chatMessages, showBackToBottom]);

    // Scroll listener to collapse empty input card on scroll-up
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const currentScrollTop = container.scrollTop;
            const maxScrollTop = container.scrollHeight - container.clientHeight;
            
            // Collapse if the user has scrolled up away from the bottom of the thread
            const isScrolledAwayFromBottom = currentScrollTop < maxScrollTop - 30;
            setShowBackToBottom(isScrolledAwayFromBottom);

            if (!chatInput.trim()) {
                if (isScrolledAwayFromBottom) {
                    setIsChatInputCollapsed(true);
                } else {
                    setIsChatInputCollapsed(false);
                }
            } else {
                setIsChatInputCollapsed(false);
            }

            lastScrollTopRef.current = currentScrollTop;
        };

        container.addEventListener("scroll", handleScroll, { passive: true });
        return () => container.removeEventListener("scroll", handleScroll);
    }, [chatInput]);

    // Auto-expand/shrink chat textarea height (min 2 lines, max 5 lines)
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
    };

    const getChatErrorMessage = (err: ApiError) => {
        if (err.status === 503) {
            return CHAT_UNAVAILABLE_MESSAGE;
        }
        if (err.status === 401 || err.status === 403) {
            return "Your session needs attention. Please sign in again and retry.";
        }
        return err.detail || err.message || "Failed to reach the resume assistant. Your message was not sent.";
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

    const streamResumeTailorSuggestion = async (
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
            throw error;
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

    const streamResumeChatResponse = async (payload: {
        message: string;
        resume_data: ResumeData;
        history: ResumeChatMessage[];
    }) => {
        const token = await getIdToken();
        const baseUrl = import.meta.env.VITE_API_BASE_URL_LOCAL;
        const response = await fetch(`${baseUrl}/api/resume/chat/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload),
            signal: abortControllerRef.current?.signal
        });

        if (!response.ok) {
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
            throw error;
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
                    applyStreamEvent(event);
                } catch {
                    receivedText = true;
                    appendToLastAssistantMessage(line);
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

        if (!receivedText) {
            appendToLastAssistantMessage("I did not receive a response from the local model.");
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
                    formatting: getCurrentResumeFormatting()
                }),
                history
            };

            setChatMessages(prev => [...prev, { sender: "assistant", text: "" }]);
            await streamResumeChatResponse(payload);
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

    // Track dirty changes
    const activeSavedResume = useMemo(() => {
        return resumesList.find((r) => r.id === activeResumeId) || null;
    }, [resumesList, activeResumeId]);

    // Memoize the filtered list based on the search query
    const filteredResumes = useMemo(() => {
        const source = searchQuery.trim()
            ? resumesList.filter((res) => {
            const matchesName = res.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFullName = res.resume_data.fullName && res.resume_data.fullName.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesName || matchesFullName;
            })
            : resumesList;

        return [...source].sort((a, b) => {
            if (a.is_master !== b.is_master) return a.is_master ? -1 : 1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
    }, [resumesList, searchQuery]);

    // Check if dirty
    useEffect(() => {
        if (!activeSavedResume) {
            setIsDirty(true);
            return;
        }
        const savedString = JSON.stringify(normalizeResumeDataForPayload(activeSavedResume.resume_data));
        const currentString = JSON.stringify(normalizeResumeDataForPayload({
            ...resumeData,
            formatting: getCurrentResumeFormatting()
        }));
        setIsDirty(savedString !== currentString || activeSavedResume.name !== resumeName || activeSavedResume.is_master !== isMaster);
    }, [resumeData, resumeName, isMaster, activeSavedResume, pageSize, titleFontSize, headerFontSize, bodyFontSize, pageMarginPt, paperLayoutFormat]);

    // ---------- CRUD Operations ----------
    const fetchResumes = async (preferredActiveResumeId?: string) => {
        setLoadingList(true);
        setError(null);
        try {
            const resp = await api("/api/resume/resumes");
            if (resp.status === "success") {
                setResumesList(resp.resumes);
                if (resp.resumes.length > 0) {
                    if (preferredActiveResumeId) {
                        const preferred = resp.resumes.find((r: SavedResume) => r.id === preferredActiveResumeId);
                        if (preferred) {
                            loadResumeIntoWorkspace(preferred);
                        }
                    } else if (!activeResumeId) {
                        const master = resp.resumes.find((r: SavedResume) => r.is_master) || resp.resumes[0];
                        loadResumeIntoWorkspace(master);
                    }
                } else {
                    // First time user: create a database-backed master resume.
                    handleCreateResume(false, true);
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load saved resumes.");
        } finally {
            setLoadingList(false);
        }
    };

    const loadResumeIntoWorkspace = (res: SavedResume) => {
        setActiveResumeId(res.id);
        setResumeName(res.name);
        setIsMaster(res.is_master);
        const normalizedData = normalizeResumeData(res.resume_data);
        setResumeData(normalizedData);
        applyResumeFormatting(normalizedData.formatting);
        setIsDraft(false);
        setOriginalResumeDataBeforeDraft(null);
        setChangeMetadata([]);
        setError(null);
        setSuccessMessage(null);
    };

    const handleCreateNewClick = () => {
        const hasExistingMaster = resumesList.some((r) => r.is_master);
        if (resumesList.length === 0 || !hasExistingMaster) {
            handleCreateResume(false, true);
            return;
        }

        const preferredAction = localStorage.getItem("resume_clone_preference");
        if (preferredAction === "clone") {
            handleCreateResume(true, false);
        } else if (preferredAction === "scratch") {
            handleCreateResume(false, false);
        } else {
            setShowCloneModal(true);
        }
    };

    const handleCreateResume = async (cloneMaster: boolean, forceMaster: boolean = false) => {
        setShowCloneModal(false);
        setActiveResumeId(null);
        setChangeMetadata([]);
        setIsDraft(false);
        setOriginalResumeDataBeforeDraft(null);
        setError(null);
        setSuccessMessage(null);

        let nextData: ResumeData;
        let nextName = "New Resume Version";
        let nextIsMaster = false;
        let sourceResumeId: string | null = null;

        if (forceMaster) {
            nextData = defaultResumeData();
            nextName = "Primary Resume";
            nextIsMaster = true;
        } else if (cloneMaster) {
            const master = resumesList.find((r) => r.is_master);
            if (master) {
                nextData = normalizeResumeData(JSON.parse(JSON.stringify(master.resume_data)));
                nextName = `Copy of ${master.name}`;
                sourceResumeId = master.id;
            } else {
                nextData = defaultResumeData();
            }
        } else {
            const defaultFormatting = defaultResumeFormatting();
            nextData = {
                fullName: "Your Name",
                experience: [],
                education: [],
                skills: [],
                formatting: defaultFormatting
            };
        }

        setResumeData(nextData);
        applyResumeFormatting(nextData.formatting);
        setIsMaster(nextIsMaster);
        setResumeName(nextName);
        setLoadingSave(true);

        try {
            const resp = await api("/api/resume/resumes", {
                method: "POST",
                body: JSON.stringify({
                    name: nextName,
                    is_master: nextIsMaster,
                    source_resume_id: sourceResumeId,
                    resume_data: normalizeResumeDataForPayload(nextData)
                })
            });

            if (resp.status === "success") {
                loadResumeIntoWorkspace(resp.resume);
                await fetchResumes(resp.resume.id);
                setSuccessMessage(
                    nextIsMaster
                        ? "Primary resume created and saved."
                        : cloneMaster && sourceResumeId
                        ? "Resume cloned from master and saved."
                        : "Blank resume created and saved."
                );
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to create resume.");
        } finally {
            setLoadingSave(false);
        }
    };

    const handleSaveResume = async () => {
        setLoadingSave(false);
        setError(null);
        setSuccessMessage(null);

        const finalPayloadData = normalizeResumeDataForPayload({
            ...resumeData,
            formatting: getCurrentResumeFormatting()
        });

        setLoadingSave(true);
        try {
            let resp;
            if (activeResumeId) {
                resp = await api(`/api/resume/resumes/${activeResumeId}`, {
                    method: "PUT",
                    body: JSON.stringify({
                        name: resumeName,
                        is_master: isMaster,
                        resume_data: finalPayloadData
                    })
                });
            } else {
                const master = resumesList.find((r) => r.is_master);
                resp = await api("/api/resume/resumes", {
                    method: "POST",
                    body: JSON.stringify({
                        name: resumeName,
                        is_master: isMaster,
                        source_resume_id: master ? master.id : null,
                        resume_data: finalPayloadData
                    })
                });
            }

            if (resp.status === "success") {
                setSuccessMessage("Resume saved successfully!");
                setIsDraft(false);
                setOriginalResumeDataBeforeDraft(null);
                setChangeMetadata([]);
                await fetchResumes(resp.resume.id);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to save resume.");
        } finally {
            setLoadingSave(false);
        }
    };

    const handleDeleteResume = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this resume?")) return;

        setError(null);
        setSuccessMessage(null);
        try {
            const resp = await api(`/api/resume/resumes/${id}`, {
                method: "DELETE"
            });
            if (resp.status === "success") {
                setSuccessMessage("Resume deleted.");
                if (activeResumeId === id) {
                    setActiveResumeId(null);
                    const nextData = defaultResumeData();
                    setResumeData(nextData);
                    applyResumeFormatting(nextData.formatting);
                }
                fetchResumes();
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to delete resume.");
        }
    };

    // ---------- Inline Canvas Field updates ----------
    const updateField = (field: keyof ResumeData, value: any) => {
        setResumeData((prev) => ({ ...prev, [field]: value }));
    };

    const addCustomContactField = () => {
        setResumeData((prev) => ({
            ...prev,
            customContact: [...(prev.customContact || []), { label: "Add text", value: "" }]
        }));
    };

    const updateCustomContactField = (index: number, field: "label" | "value", val: string) => {
        setResumeData((prev) => {
            const list = [...(prev.customContact || [])];
            if (list[index]) {
                list[index] = { ...list[index], [field]: val };
            }
            return { ...prev, customContact: list };
        });
    };

    const removeCustomContactField = (index: number) => {
        setResumeData((prev) => ({
            ...prev,
            customContact: (prev.customContact || []).filter((_, idx) => idx !== index)
        }));
    };

    const removeStandardContactField = (field: ContactFieldKey) => {
        setResumeData((prev) => ({
            ...prev,
            [field]: "",
            hiddenContactFields: Array.from(new Set([...(prev.hiddenContactFields || []), field]))
        }));
    };

    const updateExperienceField = (id: string, field: keyof ExperienceItem, value: any) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === id ? { ...exp, [field]: value } : exp
            )
        }));
    };

    const insertExperienceAt = (index: number) => {
        const id = makeId();
        setResumeData((prev) => ({
            ...prev,
            experience: (() => {
                const nextExperience = [...(prev.experience || [])];
                nextExperience.splice(Math.max(0, Math.min(index, nextExperience.length)), 0, {
                    id,
                    jobTitle: "",
                    company: "",
                    location: "",
                    startDate: "",
                    endDate: "",
                    bullets: []
                });
                return nextExperience;
            })()
        }));
    };

    const removeExperience = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).filter((exp) => exp.id !== id)
        }));
    };

    const clearExperience = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === id
                    ? {
                        ...exp,
                        jobTitle: "",
                        company: "",
                        location: "",
                        startDate: "",
                        endDate: "",
                        bullets: []
                    }
                    : exp
            )
        }));
    };

    const addBulletWithText = (expId: string, text: string) => {
        const normalizedText = text.trimStart();
        if (!normalizedText.trim()) return;

        const bulletId = makeId();
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) => {
                if (exp.id === expId) {
                    return {
                        ...exp,
                        bullets: [...(exp.bullets || []), { id: bulletId, text: normalizedText }]
                    };
                }
                return exp;
            })
        }));

        const expIdx = resumeData.experience.findIndex(exp => exp.id === expId);
        const bulletIdx = (resumeData.experience[expIdx]?.bullets || []).length;
        const newPath = `experience.${expIdx}.bullets.${bulletIdx}`;
        setFocusedField(newPath);
    };

    const updateBulletText = (expId: string, bulletId: string, value: string) => {
        const expIdx = resumeData.experience.findIndex((exp) => exp.id === expId);
        const bulletIdx = resumeData.experience[expIdx]?.bullets?.findIndex((bullet) => bullet.id === bulletId) ?? -1;
        const bulletPath = expIdx >= 0 && bulletIdx >= 0 ? `experience.${expIdx}.bullets.${bulletIdx}` : null;

        if (!value.trim()) {
            removeBullet(expId, bulletId);
            if (bulletPath) {
                setFocusedField((current) => current === bulletPath ? null : current);
                setHoveredField((current) => current === bulletPath ? null : current);
            }
            return;
        }

        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === expId
                    ? {
                        ...exp,
                        bullets: (exp.bullets || []).map((b) =>
                            b.id === bulletId ? { ...b, text: value } : b
                        )
                    }
                    : exp
            )
        }));
    };

    const removeBullet = (expId: string, bulletId: string) => {
        setResumeData((prev) => ({
            ...prev,
            experience: (prev.experience || []).map((exp) =>
                exp.id === expId
                    ? { ...exp, bullets: (exp.bullets || []).filter((b) => b.id !== bulletId) }
                    : exp
            )
        }));
    };

    const updateEducationField = (id: string, field: keyof EducationItem, value: any) => {
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === id ? { ...ed, [field]: value } : ed
            )
        }));
    };

    const addEducation = () => {
        const id = makeId();
        setResumeData((prev) => ({
            ...prev,
            education: [
                ...(prev.education || []),
                { id, school: "", degree: "", startDate: "", endDate: "", details: [] }
            ]
        }));
    };

    const removeEducation = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).filter((ed) => ed.id !== id)
        }));
    };

    const addEducationDetailWithText = (educationId: string, text: string) => {
        const normalizedText = text.trimStart();
        if (!normalizedText.trim()) return;
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === educationId
                    ? {
                        ...ed,
                        details: [...(ed.details || []), { id: makeId(), text: normalizedText }]
                    }
                    : ed
            )
        }));
    };

    const updateEducationDetailText = (educationId: string, detailId: string, value: string) => {
        const educationIdx = resumeData.education.findIndex((ed) => ed.id === educationId);
        const detailIdx = resumeData.education[educationIdx]?.details?.findIndex((detail) => detail.id === detailId) ?? -1;
        const detailPath = educationIdx >= 0 && detailIdx >= 0 ? `education.${resumeData.education[educationIdx].id}.details.${detailIdx}` : null;

        if (!value.trim()) {
            removeEducationDetail(educationId, detailId);
            if (detailPath) {
                setFocusedField((current) => current === detailPath ? null : current);
                setHoveredField((current) => current === detailPath ? null : current);
            }
            return;
        }

        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === educationId
                    ? {
                        ...ed,
                        details: (ed.details || []).map((detail) =>
                            detail.id === detailId ? { ...detail, text: value } : detail
                        )
                    }
                    : ed
            )
        }));
    };

    const removeEducationDetail = (educationId: string, detailId: string) => {
        setResumeData((prev) => ({
            ...prev,
            education: (prev.education || []).map((ed) =>
                ed.id === educationId
                    ? { ...ed, details: (ed.details || []).filter((detail) => detail.id !== detailId) }
                    : ed
            )
        }));
    };

    const addSkillCategory = () => {
        setResumeData((prev) => ({
            ...prev,
            skills: [
                ...(prev.skills || []),
                { id: makeId(), category: "Skills", items: [], rawItems: "" }
            ]
        }));
    };

    const updateSkillCategoryName = (id: string, value: string) => {
        setResumeData((prev) => ({
            ...prev,
            skills: (prev.skills || []).map((skill) =>
                skill.id === id ? { ...skill, category: value } : skill
            )
        }));
    };

    const updateSkillCategoryItems = (id: string, value: string) => {
        const items = parseSkillItems(value);
        setResumeData((prev) => ({
            ...prev,
            skills: (prev.skills || []).map((skill) =>
                skill.id === id ? { ...skill, items, rawItems: value } : skill
            )
        }));
    };

    const removeSkillCategory = (id: string) => {
        setResumeData((prev) => ({
            ...prev,
            skills: (prev.skills || []).filter((skill) => skill.id !== id)
        }));
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
            } catch (err: any) {
                console.error(err);
                setSummaryRewriteSuggestion((current) => current?.isStreaming ? null : current);
                setError(getRewriteErrorMessage(err));
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
                } catch (err: any) {
                    console.error(err);
                    removeExperienceRewriteItem(experience.id, bullet.id);
                    setError(getRewriteErrorMessage(err));
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
                formatting: getCurrentResumeFormatting()
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
    const handleAnalyzeSummary = () => {
        if (!resumeData.summary) return;
        setIsRightRailCollapsed(false);
        setChatInput("Review my professional summary for clarity and impact.");
        setIsChatInputCollapsed(false);
        chatInputRef.current?.focus();
    };

    // ---------- PDF Export (Phase 5) ----------
    const triggerPdfDownload = async () => {
        setFontPreviewTarget(null);
        setIsMarginPreviewVisible(false);
        setIsPageFormatPreviewVisible(false);
        setIsSectionGapPreviewVisible(false);

        const exportData = normalizeResumeDataForPayload({
            ...resumeData,
            formatting: getCurrentResumeFormatting()
        });
        const filenameBase = (exportData.fullName || "resume").trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_") || "resume";

        try {
            setLoadingPdfExport(true);
            const { blob, filename } = await apiBlob("/api/resume/export-pdf", {
                method: "POST",
                body: JSON.stringify(exportData)
            });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = filename || `${filenameBase}.pdf`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
            setSuccessMessage("PDF exported.");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to export PDF.");
        } finally {
            setLoadingPdfExport(false);
        }
    };

    // ---------- Render Helpers ----------
    const isFieldChanged = (path: string): { changed: boolean; reason?: string } => {
        const match = changeMetadata.find((m) => m.path === path);
        return match ? { changed: true, reason: match.reason } : { changed: false };
    };

    const renderOverlayInput = (params: {
        path: string;
        label: string;
        value: string;
        placeholder: string;
        className: string;
        style?: React.CSSProperties;
        onChange: (val: string) => void;
        onDelete?: () => void;
        onCustomAction?: () => void;
        customActionTitle?: string;
        customActionIcon?: React.ReactNode;
        isAutoResize?: boolean;
        showTextStats?: boolean;
        customActionPlacement?: "tray" | "left" | "right";
        disableClear?: boolean;
        disableDelete?: boolean;
        containerClassName?: string;
        inputContainerClassName?: string;
    }) => {
        return (
            <OverlayInput
                {...params}
                hoveredField={hoveredField}
                setHoveredField={setHoveredField}
                focusedField={focusedField}
                setFocusedField={setFocusedField}
            />
        );
    };

    const paperMetrics = PAPER_SIZES[pageSize];
    const fitZoom = useMemo(() => {
        if (!canvasViewportSize.width || !canvasViewportSize.height) return 1;

        const availableWidth = Math.max(0, canvasViewportSize.width - 64);
        const availableHeight = Math.max(0, canvasViewportSize.height - 88);
        return clampFitZoom(Math.min(availableWidth / paperMetrics.width, availableHeight / paperMetrics.height));
    }, [canvasViewportSize.height, canvasViewportSize.width, paperMetrics.height, paperMetrics.width]);
    const canvasZoom = zoomMode === "fit" ? fitZoom : manualZoom;
    const zoomPercent = Math.round(animatedCanvasZoom * 100);
    const scaledCanvasWidth = paperMetrics.width * animatedCanvasZoom;
    const scaledCanvasHeight = paperMetrics.height * animatedCanvasZoom;
    const canvasHorizontalPadding = 64;
    const canvasVerticalPadding = 80;
    const canvasNeedsHorizontalScroll = scaledCanvasWidth + canvasHorizontalPadding > canvasViewportSize.width + 1;
    const canvasNeedsVerticalScroll = scaledCanvasHeight + canvasVerticalPadding > canvasViewportSize.height + 1;
    const isPageStyleShelfCompact = canvasViewportSize.width > 0 && canvasViewportSize.width <= 1000;
    const printWidth = pageSize === "a4" ? "210mm" : "8.5in";
    const printHeight = pageSize === "a4" ? "297mm" : "11in";
    const documentSectionGapPx = SECTION_GAP_PX[paperLayoutFormat] ?? SECTION_GAP_PX.standard;
    const documentSectionGapStyle: React.CSSProperties = { marginBottom: `${documentSectionGapPx}px` };
    const currentResumeFormatting = getCurrentResumeFormatting();

    useEffect(() => {
        let frameId = 0;
        let startTime: number | null = null;
        const startZoom = animatedCanvasZoom;
        const zoomDelta = canvasZoom - startZoom;
        const duration = 260;

        if (Math.abs(zoomDelta) < 0.001) {
            setAnimatedCanvasZoom(canvasZoom);
            return;
        }

        const animateZoom = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const progress = Math.min(1, (timestamp - startTime) / duration);
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            setAnimatedCanvasZoom(startZoom + zoomDelta * easedProgress);

            if (progress < 1) {
                frameId = requestAnimationFrame(animateZoom);
            } else {
                setAnimatedCanvasZoom(canvasZoom);
            }
        };

        frameId = requestAnimationFrame(animateZoom);
        return () => cancelAnimationFrame(frameId);
    }, [canvasZoom]);

    const handleFitZoom = () => {
        setZoomMode("fit");
        requestAnimationFrame(() => {
            canvasViewportRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        });
    };

    const handleTogglePageStyleShelf = () => {
        setIsPageStyleShelfOpen((isOpen) => {
            if (!isOpen && zoomMode !== "fit") {
                handleFitZoom();
            }
            return !isOpen;
        });
    };

    // Styles for inputs directly on document
    const inputStyleClass = "w-full bg-transparent border border-transparent hover:bg-slate-100/70 hover:border-slate-300 focus:bg-sky-50/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/15 rounded-sm outline-none px-1.5 py-0.5 text-[#1e293b] transition-colors duration-150";
    const contentFitInputStyleClass = inputStyleClass.replace("w-full", "w-auto");
    const boldInputClass = `${inputStyleClass} font-bold text-[#0f172a]`;
    const documentTextStyle = { fontSize: `${bodyFontSize}px` };
    const sectionHeadingClass = "resume-header-font-target w-full text-left font-sans font-bold text-[#0f172a] border-b border-[#cbd5e1] pb-0.5 uppercase";
    const sectionHeadingStyle = {
        fontSize: `${headerFontSize}px`,
        lineHeight: "1.1",
        letterSpacing: 0,
        marginBottom: "4px"
    };
    const compactFitMetaInputClass = `${contentFitInputStyleClass} shrink-0 truncate leading-[1.25] text-[#1f2937] font-semibold`;
    const compactFitDateInputClass = `${contentFitInputStyleClass} shrink-0 truncate leading-[1.25] text-[#475569] font-medium`;
    const contactInputClass = `${inputStyleClass} resume-body-font-target shrink-0 leading-[1.2] text-[#475569] font-medium hover:bg-slate-100/60`;
    const resumeDividerClass = "shrink-0 text-slate-300/70";
    const measureTextWidth = (text: string, font: string = "500 12px Poppins, Arial, sans-serif") => {
        if (!text) return 0;
        if (typeof document === "undefined") {
            const charSize = font.includes("24px") ? 14 : 7;
            return text.length * charSize;
        }
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
            const charSize = font.includes("24px") ? 14 : 7;
            return text.length * charSize;
        }
        context.font = font;
        return context.measureText(text).width;
    };
    const getDynamicInputStyle = (
        value: string | undefined,
        placeholder: string,
        font: string = "500 12px Poppins, Arial, sans-serif",
        extraStyles: React.CSSProperties = {}
    ): any => {
        const content = value?.trim() || placeholder || "";
        const padding = font.includes("24px") ? 24 : 16;
        const contentWidth = Math.ceil(measureTextWidth(content, font) + padding);
        const minWidth = 16; // 1rem (16px) minimum size limit
        return {
            ...documentTextStyle,
            ...extraStyles,
            width: `${Math.max(minWidth, contentWidth)}px`,
            minWidth: `${minWidth}px`,
            fieldSizing: "content"
        };
    };
    const contactFieldStyle = (value: string | undefined, placeholder: string): React.CSSProperties => {
        return getDynamicInputStyle(value, placeholder, `500 ${bodyFontSize}px Poppins, Arial, sans-serif`, { fontSize: `${bodyFontSize}px` });
    };
    const resumeChromeRootClass = isLightMode
        ? "flex h-full min-h-0 w-full flex-col text-slate-900 relative overflow-hidden select-none"
        : "flex h-full min-h-0 w-full flex-col text-slate-100 relative overflow-hidden select-none";
    const resumeChromeBackground = isLightMode
        ? "radial-gradient(circle at 45% 0%, rgba(14, 116, 144, 0.10), transparent 34%), linear-gradient(135deg, #e5e7eb, #d1d5db 48%, #e2e8f0)"
        : "radial-gradient(circle at 45% 0%, rgba(14, 116, 144, 0.18), transparent 34%), linear-gradient(135deg, rgba(2, 6, 23, 0.94), rgba(15, 23, 42, 0.98) 46%, rgba(2, 6, 23, 0.96))";
    const headerShellStyle: React.CSSProperties = {
        background: isLightMode ? "rgba(248, 250, 252, 0.86)" : "rgba(2, 6, 23, 0.72)",
        borderColor: isLightMode ? "rgba(100, 116, 139, 0.24)" : "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)",
        fontFamily: "var(--font-body)"
    };
    const railShellStyle: React.CSSProperties = {
        background: isLightMode
            ? "linear-gradient(180deg, rgba(248, 250, 252, 0.92), rgba(226, 232, 240, 0.82))"
            : "linear-gradient(180deg, rgba(2, 6, 23, 0.84), rgba(15, 23, 42, 0.72))",
        borderColor: isLightMode ? "rgba(100, 116, 139, 0.24)" : "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)"
    };
    const rightRailShellStyle: React.CSSProperties = {
        background: isLightMode
            ? "linear-gradient(180deg, rgba(248, 250, 252, 0.94), rgba(226, 232, 240, 0.86))"
            : "linear-gradient(180deg, rgba(2, 6, 23, 0.9), rgba(15, 23, 42, 0.78))",
        borderColor: isLightMode ? "rgba(100, 116, 139, 0.24)" : "rgba(148, 163, 184, 0.14)",
        backdropFilter: "blur(18px)",
        fontFamily: "var(--font-body)"
    };
    const toolbarSurfaceStyle: React.CSSProperties = {
        fontFamily: "var(--font-body)",
        backdropFilter: "blur(22px) saturate(160%)",
        WebkitBackdropFilter: "blur(22px) saturate(160%)"
    };
    const shelfSurfaceStyle: React.CSSProperties = {
        fontFamily: "var(--font-body)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)"
    };
    const railTitleClass = `whitespace-nowrap ${isLightMode ? "text-slate-700" : "text-slate-300"} font-semibold transition-opacity duration-150`;
    const railTitleStyle = { fontSize: "14px", letterSpacing: "0.025em", fontFamily: "var(--font-body)" };
    const railHeaderRowClass = "flex h-9 shrink-0 items-center";
    const headerActionButtonClass = `!inline-flex h-8 !h-8 w-8 !w-8 shrink-0 items-center justify-center rounded-lg border border-transparent !bg-transparent !p-0 transition-colors duration-200 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
        isLightMode ? "hover:border-slate-300/70 hover:!bg-slate-900/[0.055]" : "hover:border-white/10 hover:!bg-white/[0.055]"
    }`;
    const headerActionIconClass = "h-4 w-4";
    const headerMarginAddClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 ${activeDocumentSection === "header" ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const isExperienceSectionActive = activeDocumentSection === "experience";
    const experienceMarginAddClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const experienceMarginImproveClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-sky-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-sky-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const experienceMarginClearClass = `resume-edit-control absolute -right-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-slate-500 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-slate-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const experienceMarginDeleteClass = `resume-edit-control absolute -right-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-rose-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-rose-600 active:scale-95 ${isExperienceSectionActive ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const isSummarySectionActive = activeDocumentSection === "summary";
    const showSummaryControls = isSummarySectionActive || hoveredSummary || focusedSummary;
    const summaryMarginImproveClass = `resume-edit-control absolute -left-9 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-sky-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-sky-600 active:scale-95 ${showSummaryControls ? "opacity-100" : "pointer-events-none opacity-0"}`;
    const documentToolButtonClass = `resume-edit-control !inline-flex h-5 !h-5 w-7 !w-7 min-w-7 shrink-0 items-center justify-center rounded-none border border-transparent !bg-transparent !p-0 shadow-none transition-[background,border-color,color,transform] active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 ${
        isLightMode ? "text-slate-600 hover:border-slate-300 hover:!bg-slate-900/[0.06] hover:text-slate-950" : "text-slate-400 hover:border-white/14 hover:!bg-white/[0.08] hover:text-slate-100"
    }`;
    const shelfSectionClass = "flex h-full w-fit min-w-max flex-col justify-between py-3";
    const shelfSectionTitleClass = `resume-page-style-shelf-title self-center text-center !text-[10px] font-semibold leading-none ${isLightMode ? "text-slate-800" : "text-slate-200/95"}`;
    const shelfControlLabelClass = `!text-[10px] font-medium leading-none ${isLightMode ? "text-slate-500" : "text-slate-400"}`;
    const shelfDividerClass = `my-3 w-px bg-gradient-to-b from-transparent ${isLightMode ? "via-slate-300" : "via-white/16"} to-transparent`;
    const shelfSegmentGroupClass = `flex !h-7 !max-h-none items-center gap-0.5 rounded-md border p-0.5 ${
        isLightMode ? "border-slate-300/80 bg-slate-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]" : "border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    }`;
    const shelfSegmentButtonClass = `relative !inline-flex !h-6 !max-h-none min-h-0 !w-auto !min-w-0 shrink-0 items-center justify-center rounded-none border border-transparent !bg-transparent !px-2 !py-0 !text-[10px] font-semibold leading-none !shadow-none transition-[background,border-color,color,transform] active:scale-95 ${
        isLightMode ? "text-slate-600 hover:border-slate-300 hover:!bg-white/85 hover:text-slate-950" : "text-slate-400 hover:border-white/12 hover:!bg-white/[0.07] hover:text-slate-100"
    }`;
    const shelfSegmentIndicatorClass = `pointer-events-none absolute bottom-0.5 left-1.5 right-1.5 h-px rounded-full ${isLightMode ? "bg-sky-600 shadow-[0_0_10px_rgba(2,132,199,0.38)]" : "bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.65)]"}`;
    const shelfStepperButtonClass = `resume-edit-control !inline-flex !h-6 !max-h-none !w-6 min-h-0 !min-w-0 shrink-0 items-center justify-center rounded-none border border-transparent !bg-transparent !p-0 !text-[11px] font-medium leading-none !shadow-none transition-[background,border-color,color,transform] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 ${
        isLightMode ? "text-slate-600 hover:border-slate-300 hover:!bg-white/85 hover:text-slate-950" : "text-slate-400 hover:border-white/12 hover:!bg-white/[0.08] hover:text-slate-100"
    }`;
    const shelfStepperControlClass = "flex w-fit min-w-0 flex-col items-center gap-1.5";
    const shelfStepperLabelClass = "w-full text-center";
    const shelfStepperValueClass = `min-w-10 text-center !text-[13px] font-semibold leading-none ${isLightMode ? "text-slate-800" : "text-slate-200"}`;
    const shelfStepperRowClass = `grid grid-cols-[24px_44px_24px] items-center rounded-md border p-0.5 ${
        isLightMode ? "border-slate-300/80 bg-slate-100/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]" : "border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    }`;
    const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const isAssistantGenerating = chatMessages.length > 0 && 
        chatMessages[chatMessages.length - 1].sender === "assistant" && 
        chatMessages[chatMessages.length - 1].text !== "";

    const summaryRewriteHoverAction = rewriteActionHover?.target === "summary" ? rewriteActionHover.action : null;
    const summaryCurrentRewriteClass = summaryRewriteHoverAction === "accept"
        ? "resume-rewrite-current-accept-hover"
        : summaryRewriteHoverAction === "reject"
        ? "resume-rewrite-current-reject-hover"
        : "";
    const showHeaderContactEditors = activeDocumentSection === "header" || Boolean(hoveredContactField || focusedContactField);
    const headerHiddenContactFields = new Set(resumeData.hiddenContactFields || []);
    const headerStandardContactFields: Extract<ContactRenderField, { isCustom: false }>[] = [
        { key: "location", value: resumeData.location, placeholder: "City, State", isCustom: false },
        { key: "phone", value: resumeData.phone, placeholder: "Phone", isCustom: false },
        { key: "email", value: resumeData.email, placeholder: "Email", isCustom: false },
        { key: "linkedin", value: resumeData.linkedin, placeholder: "LinkedIn", isCustom: false },
        { key: "website", value: resumeData.website, placeholder: "Portfolio", isCustom: false },
        { key: "github", value: resumeData.github, placeholder: "GitHub", isCustom: false }
    ];
    const headerContactFields: ContactRenderField[] = [
        ...headerStandardContactFields.filter((field) => !headerHiddenContactFields.has(field.key) && (showHeaderContactEditors || hasText(field.value))),
        ...(resumeData.customContact || [])
            .map((c, idx): ContactRenderField => ({
                key: `custom_${idx}`,
                value: c.value,
                placeholder: c.label || "Add text",
                isCustom: true,
                index: idx,
                label: c.label
            }))
            .filter((field) => showHeaderContactEditors || hasText(field.value))
    ];
    const headerContactRows: ContactRenderField[][] = [];
    for (let i = 0; i < headerContactFields.length; i += 3) {
        headerContactRows.push(headerContactFields.slice(i, i + 3));
    }

    const getSuggestionReviewClass = (action?: "accept" | "reject") => {
        if (action === "accept") return "resume-rewrite-suggestion-accept-hover";
        if (action === "reject") return "resume-rewrite-suggestion-reject-hover";
        return "";
    };

    const renderRewriteActionButtons = (params: {
        onAccept: () => void;
        onReject: () => void;
        onAcceptHover: () => void;
        onRejectHover: () => void;
        onClearHover: () => void;
    }) => (
        <div
            className="resume-edit-control absolute top-1/2 z-[120] flex -translate-y-1/2 items-center justify-center gap-1"
            style={{ right: `calc(-${pageMarginPt / 2}pt - 20px)` }}
        >
            <button
                type="button"
                onMouseEnter={params.onAcceptHover}
                onMouseLeave={params.onClearHover}
                onClick={params.onAccept}
                className="resume-rewrite-action-button !text-emerald-600 hover:border-emerald-500/35 hover:bg-emerald-500/10"
                style={{ color: "#059669" }}
                title="Accept AI rewrite"
                aria-label="Accept AI rewrite"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            </button>
            <button
                type="button"
                onMouseEnter={params.onRejectHover}
                onMouseLeave={params.onClearHover}
                onClick={params.onReject}
                className="resume-rewrite-action-button !text-red-600 hover:border-red-500/35 hover:bg-red-500/10"
                style={{ color: "#dc2626" }}
                title="Reject AI rewrite"
                aria-label="Reject AI rewrite"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth="3" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );

    return (
        <div
            className={resumeChromeRootClass}
            style={{
                background: resumeChromeBackground
            }}
        >
            
            {/* GOOGLE FONTS & SCROLLBAR DEFINITION */}
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..700;1,400..700&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            
            <style dangerouslySetInnerHTML={{ __html: `
                #resume-print-document {
                    display: none;
                }
                @media print {
                    @page {
                        size: ${paperMetrics.printName};
                        margin: 0;
                    }
                    html, body {
                        width: ${printWidth};
                        height: ${printHeight};
                        overflow: visible !important;
                        background: white !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #resume-print-document,
                    #resume-print-document * {
                        visibility: visible;
                    }
                    #resume-print-document {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: ${printWidth} !important;
                        height: ${printHeight} !important;
                        min-height: ${printHeight} !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                        color: black !important;
                        overflow: visible !important;
                        transform: none !important;
                        border-radius: 0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
                #print-canvas::-webkit-scrollbar {
                    width: 6px;
                }
                #print-canvas::-webkit-scrollbar-track {
                    background: transparent;
                }
                #print-canvas::-webkit-scrollbar-thumb {
                    background-color: #cbd5e1;
                    border-radius: 4px;
                }
                #print-canvas::-webkit-scrollbar-thumb:hover {
                    background-color: #94a3b8;
                }
                #print-canvas[data-font-preview="title"] .resume-title-font-target,
                #print-canvas[data-font-preview="header"] .resume-header-font-target,
                #print-canvas[data-font-preview="body"] .resume-body-font-target {
                    outline: 2px solid #38bdf8 !important;
                    outline-offset: 2px !important;
                    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18), 0 0 18px rgba(56, 189, 248, 0.34) !important;
                    background-color: rgba(240, 249, 255, 0.82) !important;
                    border-color: #38bdf8 !important;
                    border-radius: 4px !important;
                }
                .resume-margin-preview {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 120;
                    overflow: hidden;
                    border: 2px solid #38bdf8;
                    border-radius: 4px;
                    box-shadow: 0 0 18px rgba(56, 189, 248, 0.42);
                }
                .resume-margin-preview-band {
                    position: absolute;
                    background: repeating-linear-gradient(
                        135deg,
                        rgba(56, 189, 248, 0.12),
                        rgba(56, 189, 248, 0.12) 7px,
                        rgba(14, 165, 233, 0.22) 7px,
                        rgba(14, 165, 233, 0.22) 14px
                    );
                }
                .resume-margin-preview-content {
                    position: absolute;
                    border: 2px solid #38bdf8;
                    border-radius: 4px;
                    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.14), 0 0 16px rgba(56, 189, 248, 0.34);
                }
                .resume-section-gap-preview {
                    position: absolute;
                    left: 0;
                    right: 0;
                    pointer-events: none;
                    z-index: 3;
                    border: 2px solid #38bdf8;
                    border-radius: 4px;
                    background: repeating-linear-gradient(
                        135deg,
                        rgba(56, 189, 248, 0.16),
                        rgba(56, 189, 248, 0.16) 6px,
                        rgba(14, 165, 233, 0.28) 6px,
                        rgba(14, 165, 233, 0.28) 12px
                    );
                    box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.16), 0 0 16px rgba(56, 189, 248, 0.34);
                }
                .resume-page-format-preview {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 130;
                    border: 2px solid #38bdf8;
                    border-radius: 4px;
                    box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.18), 0 0 22px rgba(56, 189, 248, 0.42);
                }
                .resume-page-format-dimension {
                    position: absolute;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 999px;
                    border: 1px solid rgba(125, 211, 252, 0.72);
                    background: rgba(15, 23, 42, 0.88);
                    color: #e0f2fe;
                    font-family: var(--font-body);
                    font-size: 11px;
                    font-weight: 700;
                    line-height: 1;
                    letter-spacing: 0;
                    box-shadow: 0 10px 24px rgba(2, 6, 23, 0.28), 0 0 16px rgba(56, 189, 248, 0.24);
                    white-space: nowrap;
                }
                .resume-page-format-dimension-width {
                    left: 50%;
                    top: 0;
                    transform: translate(-50%, calc(-100% - 8px));
                    padding: 5px 10px;
                }
                .resume-page-format-dimension-height {
                    left: 0;
                    top: 50%;
                    transform: translate(calc(-100% - 8px), -50%) rotate(-90deg);
                    transform-origin: center;
                    padding: 5px 10px;
                }
                .resume-page-style-shelf button {
                    border-radius: 3px !important;
                }
                .resume-page-style-shelf button:hover {
                    border-radius: 3px !important;
                    transform: none !important;
                }
                .resume-clone-action {
                    display: inline-flex !important;
                    height: 42px !important;
                    width: 100% !important;
                    max-height: none !important;
                    align-items: center !important;
                    justify-content: center !important;
                    border-radius: 8px !important;
                    padding: 0 16px !important;
                    font-family: var(--font-body) !important;
                    font-size: 13px !important;
                    font-weight: 700 !important;
                    line-height: 1 !important;
                    white-space: nowrap !important;
                    transform: none !important;
                    transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease !important;
                }
                .resume-clone-action:hover {
                    transform: none !important;
                }
                .resume-clone-action-primary {
                    background: rgba(245, 158, 11, 0.18) !important;
                    border: 1px solid rgba(251, 191, 36, 0.52) !important;
                    color: #fde68a !important;
                    box-shadow: 0 10px 24px rgba(245, 158, 11, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
                }
                .resume-clone-action-primary:hover {
                    background: rgba(245, 158, 11, 0.26) !important;
                    border-color: rgba(253, 230, 138, 0.72) !important;
                    color: #fffbeb !important;
                    box-shadow: 0 12px 28px rgba(245, 158, 11, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
                }
                .resume-clone-action-secondary {
                    background: rgba(14, 165, 233, 0.16) !important;
                    border: 1px solid rgba(125, 211, 252, 0.48) !important;
                    color: #bae6fd !important;
                    box-shadow: 0 10px 24px rgba(14, 165, 233, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.12) !important;
                }
                .resume-clone-action-secondary:hover {
                    background: rgba(14, 165, 233, 0.24) !important;
                    border-color: rgba(186, 230, 253, 0.68) !important;
                    color: #f0f9ff !important;
                    box-shadow: 0 12px 28px rgba(14, 165, 233, 0.17), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
                }
                html[data-theme="light"] .resume-clone-action-primary {
                    background: rgba(245, 158, 11, 0.22) !important;
                    border-color: rgba(180, 83, 9, 0.42) !important;
                    color: #78350f !important;
                    box-shadow: 0 10px 24px rgba(180, 83, 9, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.78) !important;
                }
                html[data-theme="light"] .resume-clone-action-primary:hover {
                    background: rgba(245, 158, 11, 0.32) !important;
                    border-color: rgba(146, 64, 14, 0.54) !important;
                    color: #451a03 !important;
                }
                html[data-theme="light"] .resume-clone-action-secondary {
                    background: rgba(14, 165, 233, 0.18) !important;
                    border-color: rgba(2, 132, 199, 0.42) !important;
                    color: #075985 !important;
                    box-shadow: 0 10px 24px rgba(2, 132, 199, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.78) !important;
                }
                html[data-theme="light"] .resume-clone-action-secondary:hover {
                    background: rgba(14, 165, 233, 0.28) !important;
                    border-color: rgba(3, 105, 161, 0.54) !important;
                    color: #0c4a6e !important;
                }
                .resume-page-style-shelf.is-compact {
                    bottom: 4.5rem !important;
                    height: 142px !important;
                    width: fit-content !important;
                    max-width: calc(100% - 3rem) !important;
                    padding-top: 0.75rem !important;
                    padding-bottom: 0.75rem !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-layout {
                    display: grid !important;
                    width: max-content !important;
                    max-width: 100% !important;
                    grid-template-columns: repeat(4, max-content);
                    grid-template-rows: max-content max-content;
                    justify-content: center;
                    align-content: center;
                    column-gap: 1rem;
                    row-gap: 0.75rem;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-font {
                    display: contents !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-page-format {
                    grid-column: 1 / span 2;
                    grid-row: 2;
                    justify-self: center;
                    align-items: flex-start !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-spacing {
                    grid-column: 2;
                    grid-row: 1 / span 2;
                    display: contents !important;
                    justify-self: end;
                    align-items: flex-end !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-spacing-controls {
                    display: contents !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-font-controls {
                    display: contents !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-title-size {
                    grid-column: 1;
                    grid-row: 1;
                    justify-self: start;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-header-size {
                    grid-column: 2;
                    grid-row: 1;
                    justify-self: start;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-body-size {
                    grid-column: 3;
                    grid-row: 1;
                    justify-self: start;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-margins {
                    grid-column: 4;
                    grid-row: 1;
                    justify-self: start;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-section-gap {
                    grid-column: 3 / span 2;
                    grid-row: 2;
                    justify-self: center;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-divider {
                    display: none !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-section {
                    height: auto !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                }
                .resume-page-style-shelf.is-compact .resume-page-style-shelf-title {
                    display: none !important;
                }
                @media (max-width: 1000px) {
                    .resume-page-style-shelf {
                        bottom: 4.5rem !important;
                        height: 142px !important;
                        padding-top: 0.75rem !important;
                        padding-bottom: 0.75rem !important;
                    }
                    .resume-page-style-shelf-layout {
                        display: grid !important;
                        width: max-content !important;
                        max-width: 100% !important;
                        grid-template-columns: repeat(4, max-content);
                        grid-template-rows: max-content max-content;
                        justify-content: center;
                        align-content: center;
                        column-gap: 1rem;
                        row-gap: 0.75rem;
                    }
                    .resume-page-style-shelf-font {
                        display: contents !important;
                    }
                    .resume-page-style-shelf-page-format {
                        grid-column: 1 / span 2;
                        grid-row: 2;
                        justify-self: center;
                    }
                    .resume-page-style-shelf-spacing {
                        grid-column: 2;
                        grid-row: 1 / span 2;
                        display: contents !important;
                    }
                    .resume-page-style-shelf-spacing-controls,
                    .resume-page-style-shelf-font-controls {
                        display: contents !important;
                    }
                    .resume-page-style-shelf-title-size {
                        grid-column: 1;
                        grid-row: 1;
                    }
                    .resume-page-style-shelf-header-size {
                        grid-column: 2;
                        grid-row: 1;
                    }
                    .resume-page-style-shelf-body-size {
                        grid-column: 3;
                        grid-row: 1;
                    }
                    .resume-page-style-shelf-margins {
                        grid-column: 4;
                        grid-row: 1;
                    }
                    .resume-page-style-shelf-section-gap {
                        grid-column: 3 / span 2;
                        grid-row: 2;
                        justify-self: center;
                    }
                    .resume-page-style-shelf-divider {
                        display: none !important;
                    }
                    .resume-page-style-shelf-section {
                        height: auto !important;
                        padding-top: 0 !important;
                        padding-bottom: 0 !important;
                    }
                    .resume-page-style-shelf-title {
                        display: none !important;
                    }
                }
                
                /* Contact strip: allow trash pop-up to overflow downward */
                .contact-meta-field {
                    overflow: visible !important;
                }
                .contact-trash-tray {
                    overflow: hidden;
                }
                /* Input inside an active (open) field: collapse its bg/border so container glass shows through */
                .contact-meta-field[data-open="true"] .contact-item-input {
                    background: transparent !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                    color: black;
                }
                .contact-meta-field[data-open="true"] .contact-item-input::placeholder {
                    color: rgba(100, 116, 139, 0.50) !important;
                }

                /* Professional Summary block overlay */
                .summary-meta-field {
                    overflow: visible !important;
                }
                .summary-trash-tray {
                    overflow: hidden;
                }
                .summary-meta-field[data-open="true"] .summary-item-input {
                    background: transparent !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                    color: black !important;
                }
                .summary-meta-field[data-open="true"] .summary-item-input::placeholder {
                    color: rgba(100, 116, 139, 0.50) !important;
                }

                /* Generic overlay inputs inside document canvas */
                .overlay-meta-field {
                    overflow: visible !important;
                }
                .overlay-item-input {
                    white-space: pre-wrap !important;
                    word-break: break-word !important;
                    overflow: auto !important;
                    scrollbar-width: none !important;
                }
                .overlay-item-input::-webkit-scrollbar {
                    display: none !important;
                }
                .overlay-trash-tray {
                    overflow: hidden;
                }
                .overlay-meta-field[data-open="true"] .overlay-item-input {
                    background: transparent !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                    color: black;
                }
                .resume-text-stat-pill {
                    background: white !important;
                    color: black !important;
                    border: 1px solid #38bdf8 !important;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08) !important;
                }
                .resume-text-stat-pill::before {
                    display: none !important;
                }
                .document-hover-section {
                    isolation: isolate;
                    margin-left: -${pageMarginPt}pt;
                    margin-right: -${pageMarginPt}pt;
                    padding-left: ${pageMarginPt}pt;
                    padding-right: ${pageMarginPt}pt;
                    padding-top: 10px;
                    padding-bottom: 10px;
                    width: calc(100% + ${pageMarginPt * 2}pt);
                }
                .document-hover-section-border {
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    border: 1px solid rgba(30, 64, 175, 0.52);
                    background: rgba(30, 64, 175, 0.045);
                    box-shadow: inset 0 0 0 1px rgba(30, 64, 175, 0.12);
                }
                .document-hover-section[data-active="true"] > .document-hover-section-border {
                    opacity: 1;
                }
                .document-hover-section[data-section="header"] {
                    margin-top: -${pageMarginPt}pt;
                    padding-top: ${pageMarginPt}pt;
                }
                .document-hover-section[data-section="skills"] {
                    flex: 1 1 auto;
                    margin-bottom: -${pageMarginPt}pt;
                    padding-bottom: ${pageMarginPt}pt;
                }
                @property --experience-ai-angle {
                    syntax: "<angle>";
                    inherits: false;
                    initial-value: 0deg;
                }
                @keyframes experience-ai-shimmer {
                    from { --experience-ai-angle: 0deg; }
                    to { --experience-ai-angle: 360deg; }
                }
                .experience-ai-hover::before {
                    content: "";
                    pointer-events: none;
                    position: absolute;
                    inset: -2px;
                    border-radius: inherit;
                    padding: 2px;
                    --experience-ai-angle: 0deg;
                    background: conic-gradient(from var(--experience-ai-angle), rgba(30, 64, 175, 0.34), rgba(96, 165, 250, 0.82), rgba(255, 255, 255, 0.96), rgba(14, 165, 233, 0.78), rgba(30, 64, 175, 0.42), rgba(219, 234, 254, 0.90), rgba(37, 99, 235, 0.76), rgba(30, 64, 175, 0.34));
                    animation: experience-ai-shimmer 4.4s linear infinite;
                    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    box-shadow: 0 0 12px rgba(37, 99, 235, 0.18);
                }
                input.resume-rewrite-current-accept-hover,
                textarea.resume-rewrite-current-accept-hover,
                .resume-rewrite-current-accept-hover input,
                .resume-rewrite-current-accept-hover textarea {
                    color: #dc2626 !important;
                    border-color: rgba(220, 38, 38, 0.76) !important;
                    text-decoration: line-through;
                    text-decoration-color: #dc2626;
                }
                input.resume-rewrite-current-reject-hover,
                textarea.resume-rewrite-current-reject-hover,
                .resume-rewrite-current-reject-hover input,
                .resume-rewrite-current-reject-hover textarea {
                    color: #059669 !important;
                    border-color: rgba(5, 150, 105, 0.76) !important;
                }
                .resume-rewrite-suggestion-accept-hover {
                    color: #059669 !important;
                    border-color: rgba(5, 150, 105, 0.78) !important;
                    background: rgba(236, 253, 245, 0.82) !important;
                }
                .resume-rewrite-suggestion-reject-hover {
                    color: #dc2626 !important;
                    border-color: rgba(220, 38, 38, 0.78) !important;
                    background: rgba(254, 242, 242, 0.82) !important;
                }
                .resume-rewrite-suggestion-reject-hover {
                    text-decoration: line-through;
                    text-decoration-color: #dc2626;
                }
                .resume-rewrite-suggestion-text {
                    display: block;
                    border: 1px solid transparent;
                    border-radius: 4px;
                    margin: -2px -4px 0;
                    padding: 2px 4px;
                    text-align: left !important;
                    transition: background 150ms ease, border-color 150ms ease, color 150ms ease, text-decoration-color 150ms ease;
                }
                .resume-rewrite-action-button {
                    display: inline-flex !important;
                    height: 18px !important;
                    width: 18px !important;
                    min-width: 18px !important;
                    align-items: center;
                    justify-content: center;
                    border-radius: 9999px;
                    border: 1px solid transparent !important;
                    background: transparent !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    transition: background 150ms ease, border-color 150ms ease, transform 150ms ease, color 150ms ease;
                }
                .resume-rewrite-action-button:hover {
                    transform: scale(1.05);
                }
                .experience-delete-hover,
                .experience-delete-hover input,
                .experience-delete-hover textarea,
                .experience-delete-hover span {
                    color: #dc2626 !important;
                    text-decoration: line-through;
                    text-decoration-color: #dc2626;
                }
                .experience-delete-hover input::placeholder,
                .experience-delete-hover textarea::placeholder {
                    color: rgba(220, 38, 38, 0.62) !important;
                }
                .experience-clear-hover,
                .experience-clear-hover input,
                .experience-clear-hover textarea,
                .experience-clear-hover span {
                    color: #64748b !important;
                    text-decoration: line-through;
                }
                @property --experience-ai-angle {
                    syntax: "<angle>";
                    inherits: false;
                    initial-value: 0deg;
                }
                @keyframes experience-ai-shimmer {
                    from { --experience-ai-angle: 0deg; }
                    to { --experience-ai-angle: 360deg; }
                }
                .experience-ai-hover::before {
                    content: "";
                    pointer-events: none;
                    position: absolute;
                    inset: -2px;
                    border-radius: inherit;
                    padding: 2px;
                    --experience-ai-angle: 0deg;
                    background: conic-gradient(from var(--experience-ai-angle), rgba(30, 64, 175, 0.34), rgba(96, 165, 250, 0.82), rgba(255, 255, 255, 0.96), rgba(14, 165, 233, 0.78), rgba(30, 64, 175, 0.42), rgba(219, 234, 254, 0.90), rgba(37, 99, 235, 0.76), rgba(30, 64, 175, 0.34));
                    animation: experience-ai-shimmer 4.4s linear infinite;
                    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    box-shadow: 0 0 12px rgba(37, 99, 235, 0.18);
                }
                .experience-delete-hover,
                .experience-delete-hover input,
                .experience-delete-hover textarea,
                .experience-delete-hover span {
                    color: #dc2626 !important;
                    text-decoration: line-through;
                    text-decoration-color: #dc2626;
                }
                .experience-delete-hover input::placeholder,
                .experience-delete-hover textarea::placeholder {
                    color: rgba(220, 38, 38, 0.62) !important;
                }
                .experience-clear-hover,
                .experience-clear-hover input,
                .experience-clear-hover textarea,
                .experience-clear-hover span {
                    color: #64748b !important;
                    text-decoration: line-through;
                    text-decoration-color: #64748b;
                }
                .experience-clear-hover input::placeholder,
                .experience-clear-hover textarea::placeholder {
                    color: rgba(100, 116, 139, 0.70) !important;
                }
                .overlay-meta-field[data-open="true"] .overlay-item-input::placeholder {
                    color: rgba(100, 116, 139, 0.50) !important;
                }
                @keyframes text-shimmer {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                }
                .text-shimmer-light {
                    background: linear-gradient(
                        90deg,
                        #64748b 0%,
                        #64748b 35%,
                        #0284c7 50%,
                        #64748b 65%,
                        #64748b 100%
                    );
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: text-shimmer 3.5s linear infinite;
                }
                .text-shimmer-dark {
                    background: linear-gradient(
                        90deg,
                        #94a3b8 0%,
                        #94a3b8 35%,
                        #38bdf8 50%,
                        #94a3b8 65%,
                        #94a3b8 100%
                    );
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: text-shimmer 3.5s linear infinite;
                }
            `}} />
            <ResumePrintDocument
                resumeData={normalizeResumeDataForPayload({
                    ...resumeData,
                    formatting: currentResumeFormatting
                })}
                formatting={currentResumeFormatting}
            />

            {/* CLONING SELECTION PROMPT MODAL */}
            {showCloneModal && (
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
            )}

            {/* COMMAND HEADER */}
            <header 
                className={`border-b px-6 py-2.5 flex flex-col items-stretch gap-1 print:hidden shrink-0 z-20 ${
                    isLightMode ? "shadow-[0_12px_34px_rgba(15,23,42,0.12)]" : "shadow-[0_16px_45px_rgba(0,0,0,0.24)]"
                }`}
                style={headerShellStyle}
            >
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => setIsLeftRailCollapsed((value) => !value)}
                            className={`${headerActionButtonClass} ${
                                isLeftRailCollapsed
                                    ? isLightMode ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-slate-100"
                                    : isLightMode ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100"
                            }`}
                            title={isLeftRailCollapsed ? "Open resume drawer" : "Close resume drawer"}
                            aria-label={isLeftRailCollapsed ? "Open resume drawer" : "Close resume drawer"}
                            aria-pressed={!isLeftRailCollapsed}
                        >
                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4" y="4.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2 group/title min-w-0 flex-1">
                            {isMaster ? (
                                <svg className="h-4 w-4 shrink-0 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className={`h-4 w-4 shrink-0 ${isLightMode ? "text-sky-700" : "text-sky-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            <input
                                className={`text-sm font-bold bg-transparent border-b border-transparent outline-none px-1 py-0.5 rounded transition-[width,border-color,background,color] tracking-wide ${
                                    isLightMode
                                        ? "text-slate-900 hover:border-slate-300 focus:border-sky-600 focus:bg-white/70"
                                        : "text-slate-100 hover:border-slate-700 focus:border-sky-500 focus:bg-slate-950/20"
                                }`}
                                style={{
                                    width: `${Math.max((resumeName || "Unnamed Resume").length + 1, "Primary Resume".length)}ch`,
                                    maxWidth: "100%"
                                }}
                                value={resumeName}
                                onChange={(e) => {
                                    setResumeName(e.target.value);
                                    setIsDirty(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                    }
                                }}
                                placeholder="Unnamed Resume"
                                title="Rename resume. Save to persist the title."
                            />
                            <span className="opacity-0 group-hover/title:opacity-100 text-slate-500 transition-opacity pointer-events-none">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => {
                                setIsMaster(!isMaster);
                                setIsDirty(true);
                            }}
                            className={`${headerActionButtonClass} ${
                                isMaster
                                    ? "text-amber-400 hover:text-amber-300"
                                    : "text-slate-500 hover:text-amber-400"
                            }`}
                            title={isMaster ? "Active Master Profile (Click to unset)" : "Set as Master Profile"}
                        >
                            {isMaster ? (
                                <svg className={`${headerActionIconClass} drop-shadow-[0_0_4px_rgba(251,191,36,0.45)]`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.837-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={handleSaveResume}
                            disabled={loadingSave || (!isDirty && activeResumeId !== null)}
                            className={`${headerActionButtonClass} ${
                                isDirty || activeResumeId === null
                                    ? isLightMode ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100"
                                    : isLightMode ? "text-slate-500" : "text-slate-400"
                            } disabled:!cursor-default disabled:!opacity-100`}
                            title="Save current resume changes"
                            aria-label="Save current resume changes"
                        >
                            {loadingSave ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h9.5L19 5.5V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v6h8V3M8 21v-7h8v7" />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={triggerPdfDownload}
                            disabled={loadingPdfExport}
                            className={`${headerActionButtonClass} ${isLightMode ? "text-slate-600 hover:text-slate-950" : "text-slate-400 hover:text-slate-100"}`}
                            title="Download PDF"
                            aria-label="Download PDF"
                        >
                            {loadingPdfExport ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                                </svg>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRightRailCollapsed((value) => !value)}
                            className={`${headerActionButtonClass} ${
                                isRightRailCollapsed
                                    ? isLightMode ? "text-slate-500 hover:text-slate-900" : "text-slate-500 hover:text-slate-100"
                                    : isLightMode ? "text-sky-700 hover:text-sky-900" : "text-sky-300 hover:text-sky-100"
                            }`}
                            title={isRightRailCollapsed ? "Open Jaice drawer" : "Close Jaice drawer"}
                            aria-label={isRightRailCollapsed ? "Open Jaice drawer" : "Close Jaice drawer"}
                            aria-pressed={!isRightRailCollapsed}
                        >
                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4" y="4.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="flex h-4 items-center justify-center gap-2 select-none">
                    {(isDirty || isDraft) ? (
                        <>
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.55)]" />
                            <span style={{ fontSize: "10px" }} className={`${isLightMode ? "text-slate-600" : "text-slate-400"} font-medium tracking-wide`}>
                                {isDraft ? "Unsaved AI draft" : "Unsaved changes"}
                            </span>
                        </>
                    ) : (
                        <span style={{ fontSize: "10px" }} className={`${isLightMode ? "text-slate-500" : "text-slate-500"} font-medium tracking-wide`}>Saved</span>
                    )}
                </div>
            </header>

            <div className="flex min-h-0 flex-1 items-stretch">

            {/* LEFT RAIL: Document Switcher */}
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

            {/* CENTRAL WORKSPACE */}
            <main className="h-full flex-1 flex flex-col min-w-0 overflow-hidden print:p-0 relative z-10">
                
                {/* COMPACT & ELEGANT COMMAND HEADER */}
                <header 
                    className="hidden"
                    style={{ background: "rgba(2, 6, 23, 0.72)", borderColor: "rgba(148, 163, 184, 0.14)", backdropFilter: "blur(18px)", fontFamily: "var(--font-body)" }}
                >
                    <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button
                            type="button"
                            onClick={() => setIsLeftRailCollapsed((value) => !value)}
                            className={`${headerActionButtonClass} ${
                                isLeftRailCollapsed
                                    ? "text-slate-500 hover:text-slate-100"
                                    : "text-sky-300 hover:text-sky-100"
                            }`}
                            title={isLeftRailCollapsed ? "Open resume drawer" : "Close resume drawer"}
                            aria-label={isLeftRailCollapsed ? "Open resume drawer" : "Close resume drawer"}
                            aria-pressed={!isLeftRailCollapsed}
                        >
                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4" y="4.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M8 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                        <div className="flex items-center gap-2 group/title min-w-0 flex-1">
                            {isMaster ? (
                                <svg className="h-4 w-4 shrink-0 text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.35)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className={`h-4 w-4 shrink-0 ${isLightMode ? "text-sky-700" : "text-sky-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            <input
                                className="text-sm font-bold bg-transparent border-b border-transparent hover:border-slate-700 focus:border-sky-500 focus:bg-slate-950/20 outline-none px-1 py-0.5 text-slate-100 rounded transition-[width,border-color,background,color] tracking-wide"
                                style={{
                                    width: `${Math.max((resumeName || "Unnamed Resume").length + 1, "Primary Resume".length)}ch`,
                                    maxWidth: "100%"
                                }}
                                value={resumeName}
                                onChange={(e) => {
                                    setResumeName(e.target.value);
                                    setIsDirty(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                    }
                                }}
                                placeholder="Unnamed Resume"
                                title="Rename resume. Save to persist the title."
                            />
                            <span className="opacity-0 group-hover/title:opacity-100 text-slate-500 transition-opacity pointer-events-none">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </span>
                        </div>
                    </div>

                    {/* Compact actions toolbar */}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Master Toggle (Informative & Functional icon-first toggle) */}
                        <button
                            onClick={() => {
                                setIsMaster(!isMaster);
                                setIsDirty(true);
                            }}
                            className={`${headerActionButtonClass} ${
                                isMaster
                                    ? "text-amber-400 hover:text-amber-300"
                                    : "text-slate-500 hover:text-amber-400"
                            }`}
                            title={isMaster ? "Active Master Profile (Click to unset)" : "Set as Master Profile"}
                        >
                            {isMaster ? (
                                <svg className={`${headerActionIconClass} drop-shadow-[0_0_4px_rgba(251,191,36,0.45)]`} fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.837-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            )}
                        </button>

                        <button
                            onClick={handleSaveResume}
                            disabled={loadingSave || (!isDirty && activeResumeId !== null)}
                            className={`${headerActionButtonClass} ${
                                isDirty || activeResumeId === null
                                    ? "text-sky-300 hover:text-sky-100"
                                    : "text-slate-400"
                            } disabled:!cursor-default disabled:!opacity-100`}
                            title="Save current resume changes"
                            aria-label="Save current resume changes"
                        >
                            {loadingSave ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h9.5L19 5.5V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v6h8V3M8 21v-7h8v7" />
                                </svg>
                            )}
                        </button>
                        
                        <button
                            onClick={triggerPdfDownload}
                            disabled={loadingPdfExport}
                            className={`${headerActionButtonClass} text-slate-400 hover:text-slate-100`}
                            title="Download PDF"
                            aria-label="Download PDF"
                        >
                            {loadingPdfExport ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                                <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                                </svg>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsRightRailCollapsed((value) => !value)}
                            className={`${headerActionButtonClass} ${
                                isRightRailCollapsed
                                    ? "text-slate-500 hover:text-slate-100"
                                    : "text-sky-300 hover:text-sky-100"
                            }`}
                            title={isRightRailCollapsed ? "Open Jaice drawer" : "Close Jaice drawer"}
                            aria-label={isRightRailCollapsed ? "Open Jaice drawer" : "Close Jaice drawer"}
                            aria-pressed={!isRightRailCollapsed}
                        >
                            <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <rect x="4" y="4.5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M16 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                    </div>
                    <div className="flex h-4 items-center justify-center gap-2 select-none">
                        {(isDirty || isDraft) ? (
                            <>
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_7px_rgba(251,191,36,0.55)]" />
                                <span style={{ fontSize: "10px" }} className="text-slate-400 font-medium tracking-wide">
                                    {isDraft ? "Unsaved AI draft" : "Unsaved changes"}
                                </span>
                            </>
                        ) : (
                            <span style={{ fontSize: "10px" }} className="text-slate-500 font-medium tracking-wide">Saved</span>
                        )}
                    </div>
                </header>

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

                {/* THE WYSIWYG CANVAS CENTER AREA */}
                <div
                    ref={canvasViewportRef}
                    className="min-h-0 flex-1 overscroll-contain px-8 py-10 print:p-0 relative"
                    style={{
                        overflowX: canvasNeedsHorizontalScroll ? "auto" : "hidden",
                        overflowY: canvasNeedsVerticalScroll ? "auto" : "hidden"
                    }}
                >
                    <div
                        id="resume-canvas-slot"
                        className="relative mx-auto print:m-0"
                        style={{
                            width: `${scaledCanvasWidth}px`,
                            height: `${scaledCanvasHeight}px`
                        }}
                    >
                        <div
                            id="resume-canvas-scale"
                            className="absolute left-0 top-0 origin-top-left print:origin-top-left"
                            style={{
                                width: `${paperMetrics.width}px`,
                                height: `${paperMetrics.height}px`,
                                transform: `scale(${animatedCanvasZoom})`,
                                transformOrigin: "top left"
                            }}
                        >
                        {/* HIGH-FIDELITY FIXED-PAGE SHEET CANVAS */}
                        <div
                            id="print-canvas"
                            className="bg-white text-[#0f172a] shadow-[0_26px_70px_rgba(0,0,0,0.58),0_0_0_1px_rgba(255,255,255,0.08)] border border-white/80 box-border relative rounded-sm transition-shadow duration-300 flex flex-col print:h-auto"
                            data-font-preview={fontPreviewTarget || undefined}
                            style={{
                                width: `${paperMetrics.width}px`,
                                minHeight: `${paperMetrics.height}px`,
                                fontFamily: "var(--font-title)",
                                fontSize: `${bodyFontSize}px`,
                                padding: `${pageMarginPt}pt`
                            }}
                        >
                            {isPageFormatPreviewVisible && (
                                <div className="resume-page-format-preview">
                                    <span className="resume-page-format-dimension resume-page-format-dimension-width">
                                        {paperMetrics.dimensionLabel.width}
                                    </span>
                                    <span className="resume-page-format-dimension resume-page-format-dimension-height">
                                        {paperMetrics.dimensionLabel.height}
                                    </span>
                                </div>
                            )}
                            {isMarginPreviewVisible && (
                                <div className="resume-margin-preview">
                                    <div className="resume-margin-preview-band" style={{ left: 0, right: 0, top: 0, height: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-band" style={{ left: 0, right: 0, bottom: 0, height: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-band" style={{ left: 0, top: `${pageMarginPt}pt`, bottom: `${pageMarginPt}pt`, width: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-band" style={{ right: 0, top: `${pageMarginPt}pt`, bottom: `${pageMarginPt}pt`, width: `${pageMarginPt}pt` }} />
                                    <div className="resume-margin-preview-content" style={{ inset: `${pageMarginPt}pt` }} />
                                </div>
                            )}
                            <DocumentSection
                                id="header"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                            {/* --- FULL NAME --- */}
                            <div
                                className="mb-0.5 rounded-sm border border-transparent bg-transparent text-center transition-colors"
                                onMouseEnter={() => setHoveredNameSection(true)}
                                onMouseLeave={() => setHoveredNameSection(false)}
                                style={{
                                    backgroundColor: activeDocumentSection === "header" ? "#ffffff" : undefined,
                                    borderColor: (hoveredNameSection || focusedNameSection)
                                        ? "rgba(96, 165, 250, 0.78)"
                                        : activeDocumentSection === "header"
                                        ? "rgba(30, 64, 175, 0.52)"
                                        : undefined
                                }}
                            >
                                <input
                                    className={`${boldInputClass} resume-title-font-target text-center leading-none text-slate-950 py-1 hover:bg-white focus:border-transparent focus:bg-white focus:ring-0`}
                                    value={resumeData.fullName}
                                    onChange={(e) => updateField("fullName", e.target.value)}
                                    onFocus={() => setFocusedNameSection(true)}
                                    onBlur={() => setFocusedNameSection(false)}
                                    placeholder="YOUR NAME"
                                    style={getDynamicInputStyle(resumeData.fullName, "YOUR NAME", `bold ${titleFontSize}px Poppins, Arial, sans-serif`, { fontSize: `${titleFontSize}px` })}
                                />
                            </div>

                            {/* --- CONTACT STRIP --- */}
                            {(showHeaderContactEditors || headerContactRows.length > 0) && (
                            <div 
                                className="contact-strip flex flex-col items-center gap-0.5 whitespace-nowrap px-1.5 pt-0.5 pb-0 text-[#475569] border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-sm transition-colors relative group/contact z-20"
                                data-contact-open={Boolean(hoveredContactField || focusedContactField)}
                                style={{
                                    fontFamily: "var(--font-subheading)",
                                    backgroundColor: activeDocumentSection === "header" ? "#ffffff" : undefined,
                                    borderColor: activeDocumentSection === "header" ? "rgba(30, 64, 175, 0.52)" : undefined
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={addCustomContactField}
                                    className={`${headerMarginAddClass} top-0`}
                                    title="Add custom link"
                                    aria-label="Add contact metadata field"
                                >
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                                {(() => {
                                    const activeContactField = hoveredContactField || focusedContactField;
                                    const activeRowIndex = headerContactRows.findIndex((row) => row.some((field) => field.key === activeContactField));

                                    return headerContactRows.map((row, rowIdx) => {
                                        const isActiveRow = activeRowIndex === rowIdx;
                                        return (
                                        <div
                                            key={rowIdx}
                                            className="contact-row relative flex max-w-full items-center gap-1"
                                            style={{ zIndex: isActiveRow ? 70 : 0 }}
                                        >
                                            {row.map((field, fieldIdx) => (
                                                <React.Fragment key={field.key}>
                                                    {fieldIdx > 0 && (
                                                        <span className={`${resumeDividerClass} contact-divider`} style={documentTextStyle}>
                                                            &bull;
                                                        </span>
                                                    )}
                                                    {(() => {
                                                          const isOpen = hoveredContactField === field.key || focusedContactField === field.key;
                                                          const buttonsEnd = 20;
                                                          const overlayLeftPad = 2;
                                                          const overlayRightPad = buttonsEnd + 8; // 28
                                                          // Symmetric easing — same curve in/out for a smooth, balanced feel
                                                          const fluidEase = [0.32, 0.72, 0.32, 1] as [number, number, number, number];
                                                          return (
                                                              <motion.div
                                                                   className="contact-meta-field relative flex flex-col items-stretch"
                                                                   data-open={isOpen}
                                                                   onHoverStart={() => setHoveredContactField(field.key)}
                                                                   onHoverEnd={() => setHoveredContactField((current) => current === field.key ? null : current)}
                                                                   animate={{
                                                                       paddingTop: isOpen ? 2 : 0,
                                                                       paddingRight: overlayRightPad,
                                                                       paddingBottom: isOpen ? 1 : 0,
                                                                       paddingLeft: overlayLeftPad,
                                                                       marginTop: isOpen ? -2 : 0,
                                                                       marginRight: -overlayRightPad,
                                                                       marginBottom: isOpen ? -1 : 0,
                                                                       marginLeft: -overlayLeftPad,
                                                                       backgroundColor: isOpen ? "rgba(255, 255, 255, 0.94)" : "rgba(255, 255, 255, 0)",
                                                                       borderTopLeftRadius: isOpen ? 5 : 4,
                                                                       borderTopRightRadius: isOpen ? 5 : 4,
                                                                       borderBottomLeftRadius: isOpen ? 5 : 4,
                                                                       borderBottomRightRadius: isOpen ? 5 : 4,
                                                                       boxShadow: isOpen
                                                                           ? hoveredDeleteIndex === field.key
                                                                               ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #dc2626"
                                                                               : "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(14, 165, 233, 0.35)"
                                                                           : "0 0px 0px rgba(0,0,0,0), 0 0 0 0px rgba(0,0,0,0)",
                                                                   }}
                                                                  transition={{ duration: 0.28, ease: fluidEase }}
                                                                  style={{
                                                                      transformOrigin: "center",
                                                                      zIndex: isOpen ? 80 : 0,
                                                                      backdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none",
                                                                      WebkitBackdropFilter: isOpen ? "blur(22px) saturate(160%)" : "none"
                                                                  }}
                                                              >
                                                                  <div className="relative flex min-w-0 items-center">
                                                                      <input
                                                                          className={`${contactInputClass} contact-item-input placeholder:text-slate-400`}
                                                                          value={field.value || ""}
                                                                          onChange={(e) => {
                                                                              if (field.isCustom === true) {
                                                                                  updateCustomContactField(field.index, "value", e.target.value);
                                                                              } else {
                                                                                  updateField(field.key as keyof ResumeData, e.target.value);
                                                                              }
                                                                          }}
                                                                          onFocus={() => setFocusedContactField(field.key)}
                                                                          onBlur={() => setFocusedContactField((current) => current === field.key ? null : current)}
                                                                          placeholder={field.placeholder || "Add text"}
                                                                          style={{
                                                                              ...contactFieldStyle(field.value, field.placeholder || "Add text"),
                                                                              color: hoveredDeleteIndex === field.key ? "#dc2626" : isOpen ? "#0f172a" : undefined,
                                                                              textDecoration: hoveredDeleteIndex === field.key ? "line-through" : undefined,
                                                                              textDecorationColor: hoveredDeleteIndex === field.key ? "#dc2626" : undefined,
                                                                              borderRadius: isOpen ? 4 : undefined,
                                                                              transition: "color 150ms ease, text-decoration 150ms ease, text-decoration-color 150ms ease"
                                                                          }}
                                                                      />
                                                                      {isOpen && (
                                                                         <button
                                                                             type="button"
                                                                             onMouseEnter={() => setHoveredDeleteIndex(field.key)}
                                                                             onMouseLeave={() => setHoveredDeleteIndex(null)}
                                                                             onMouseDown={(e) => e.preventDefault()}
                                                                             onClick={() => {
                                                                                 if (field.isCustom === true) {
                                                                                     removeCustomContactField(field.index);
                                                                                 } else {
                                                                                     removeStandardContactField(field.key as ContactFieldKey);
                                                                                 }
                                                                             }}
                                                                             className="resume-edit-control absolute left-full top-1/2 z-10 !inline-flex !h-4 !w-4 -translate-y-1/2 items-center justify-center rounded-full border border-transparent !bg-transparent !p-0 text-[#f87171] opacity-80 shadow-none transition-[background,color,opacity] hover:!bg-red-500/15 hover:text-[#f87171] hover:opacity-100"
                                                                             style={{ marginLeft: 4 }}
                                                                             title="Delete"
                                                                             aria-label={`Delete ${field.isCustom ? "custom field" : field.placeholder}`}
                                                                         >
                                                                             <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2.75" aria-hidden="true">
                                                                                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                                             </svg>
                                                                         </button>
                                                                     )}
                                                                 </div>
                                                              </motion.div>
                                                          );
                                                    })()}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                        );
                                    });
                                })()}
                            </div>
                            )}
                            </DocumentSection>

                            {/* --- PROFESSIONAL SUMMARY --- */}
                            <DocumentSection
                                id="summary"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/summary"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                    Professional Summary
                                </h2>
                                <button
                                    type="button"
                                    onMouseEnter={() => setIsSummaryImproveHovered(true)}
                                    onMouseLeave={() => setIsSummaryImproveHovered(false)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={handleImproveSummary}
                                    disabled={Boolean(summaryRewriteSuggestion?.isStreaming) || !resumeData.summary}
                                    className={summaryMarginImproveClass}
                                    style={{ top: "28px" }}
                                    title="AI Rewrite Summary"
                                    aria-label="AI Rewrite Summary"
                                >
                                    {loadingSummaryImprove ? (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                                    ) : (
                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                        </svg>
                                    )}
                                </button>
                                <motion.div
                                    className={`summary-meta-field relative flex flex-col items-stretch ${isSummaryImproveHovered ? "experience-ai-hover" : ""}`}
                                    data-open={hoveredSummary || focusedSummary}
                                    onHoverStart={() => setHoveredSummary(true)}
                                    onHoverEnd={() => setHoveredSummary(false)}
                                    animate={{
                                        paddingTop: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 2 : 0,
                                        paddingRight: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 2 : 0,
                                        paddingBottom: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 1 : 0,
                                        paddingLeft: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 2 : 0,
                                        marginTop: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -2 : 0,
                                        marginRight: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -2 : 0,
                                        marginBottom: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -1 : 0,
                                        marginLeft: (hoveredSummary || focusedSummary || isSummarySectionActive) ? -2 : 0,
                                        backgroundColor: (hoveredSummary || focusedSummary)
                                            ? "rgba(255, 255, 255, 0.94)"
                                            : isSummarySectionActive
                                            ? "rgba(255, 255, 255, 1)"
                                            : "rgba(255, 255, 255, 0)",
                                        borderColor: summaryRewriteHoverAction
                                            ? "transparent"
                                            : (hoveredSummary || focusedSummary)
                                            ? "transparent"
                                            : isSummaryImproveHovered
                                            ? "transparent"
                                            : isSummarySectionActive
                                            ? "rgba(30, 64, 175, 0.52)"
                                            : "transparent",
                                        borderTopLeftRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        borderTopRightRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        borderBottomLeftRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        borderBottomRightRadius: (hoveredSummary || focusedSummary || isSummarySectionActive) ? 5 : 4,
                                        boxShadow: summaryRewriteHoverAction
                                            ? "0 0px 0px rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0)"
                                            : (hoveredSummary || focusedSummary)
                                            ? "0 10px 30px rgba(15, 23, 42, 0.15), 0 0 0 1px #38bdf8"
                                            : "0 0px 0px rgba(0,0,0,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0), inset 0 0 0 rgba(255,255,255,0)",
                                    }}
                                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0.32, 1] }}
                                    style={{
                                        transformOrigin: "center",
                                        zIndex: (hoveredSummary || focusedSummary) ? 80 : 0,
                                        backdropFilter: (hoveredSummary || focusedSummary) ? "blur(22px) saturate(160%)" : "none",
                                        WebkitBackdropFilter: (hoveredSummary || focusedSummary) ? "blur(22px) saturate(160%)" : "none",
                                        border: "1px solid"
                                    }}
                                >
                                    <div className="relative flex min-w-0 items-start">
                                        <AutoResizeTextarea
                                            className={`${inputStyleClass} resume-body-font-target summary-item-input leading-[1.45] text-[#334155] resize-none overflow-hidden min-h-[24px] hover:bg-slate-100/60 ${summaryCurrentRewriteClass}`}
                                            value={resumeData.summary || ""}
                                            onChange={(e) => {
                                                updateField("summary", e.target.value);
                                            }}
                                            onFocus={() => setFocusedSummary(true)}
                                            onBlur={() => setFocusedSummary(false)}
                                            placeholder="Brief professional profile summary emphasizing key skills..."
                                            style={{
                                                ...documentTextStyle,
                                                borderRadius: (hoveredSummary || focusedSummary) ? 4 : undefined,
                                                transition: "color 150ms ease, opacity 150ms ease, text-decoration-color 150ms ease"
                                            }}
                                        />
                                    </div>
                                    {hoveredSummary && (
                                        <div
                                            className="resume-text-stat-pill pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-200 shadow-[0_10px_24px_rgba(2,6,23,0.30),inset_0_1px_0_rgba(255,255,255,0.12)]"
                                        >
                                            {(resumeData.summary || "").length} chars • {(resumeData.summary || "").split(/\s+/).filter(Boolean).length} words
                                        </div>
                                    )}
                                    <AnimatePresence initial={false}>
                                        {false && (hoveredSummary || focusedSummary) && (
                                            <motion.div
                                                key="summary-tray"
                                                className="summary-trash-tray resume-edit-control absolute left-1/2 w-max -translate-x-1/2"
                                                style={{
                                                    top: "100%",
                                                    zIndex: 90,
                                                    background: "rgba(15, 23, 42, 0.58)",
                                                    borderTop: "0",
                                                    borderLeft: "0",
                                                    borderRight: "0",
                                                    borderBottom: "0",
                                                    borderRadius: "0 0 12px 12px",
                                                    boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
                                                    transformOrigin: "top center",
                                                    backdropFilter: "blur(22px) saturate(160%)",
                                                    WebkitBackdropFilter: "blur(22px) saturate(160%)"
                                                }}
                                                initial={{ opacity: 0, y: -8, scaleY: 0.94 }}
                                                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                                exit={{ opacity: 0, y: -8, scaleY: 0.94 }}
                                                transition={{ duration: 0.28, ease: [0.32, 0.72, 0.32, 1] }}
                                            >
                                                <div className="flex items-center justify-between gap-2 px-1.5 py-0.5 text-xs text-slate-300 font-medium h-6">
                                                    {isFieldChanged("summary").changed ? (
                                                        <>
                                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                <span className="text-sky-400 font-bold shrink-0 flex items-center gap-1">
                                                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                                                    </svg>
                                                                    AI Tailored
                                                                </span>
                                                                <span className="text-[11px] text-slate-400 truncate max-w-[340px]" title={isFieldChanged("summary").reason}>
                                                                    — {isFieldChanged("summary").reason}
                                                                </span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (originalResumeDataBeforeDraft) {
                                                                        setResumeData(prev => ({
                                                                            ...prev,
                                                                            summary: originalResumeDataBeforeDraft.summary
                                                                        }));
                                                                        setChangeMetadata(prev => prev.filter(m => m.path !== "summary"));
                                                                        setSuccessMessage("Reverted professional summary to original.");
                                                                    }
                                                                }}
                                                                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 transition-all font-semibold tracking-wide flex items-center gap-1 active:scale-95 cursor-pointer text-[10px] shrink-0"
                                                            >
                                                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                </svg>
                                                                Revert
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span style={{ fontSize: "10px" }} className="text-slate-400 font-medium tracking-wide select-none whitespace-nowrap">
                                                                {(resumeData.summary || "").length} chars • {(resumeData.summary || "").split(/\s+/).filter(Boolean).length} words
                                                            </span>
                                                            
                                                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAnalyzeSummary}
                                                                    className="!inline-flex !h-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 opacity-75 transition-[background,border-color,color,opacity,transform] duration-200 active:scale-95 hover:!bg-slate-500/10 hover:!border-slate-400/20 hover:opacity-100 cursor-pointer"
                                                                    style={{ color: "#94a3b8" }}
                                                                    title="Analyze Summary"
                                                                >
                                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <circle cx="11" cy="11" r="8" />
                                                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                                                    </svg>
                                                                </button>
                                                                
                                                                <button
                                                                    type="button"
                                                                    onClick={handleImproveSummary}
                                                                    disabled={Boolean(summaryRewriteSuggestion?.isStreaming) || !resumeData.summary}
                                                                    className="!inline-flex !h-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 opacity-75 transition-[background,border-color,color,opacity,transform] duration-200 active:scale-95 hover:!bg-slate-500/10 hover:!border-slate-400/20 hover:opacity-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                                                    style={{ color: "#94a3b8" }}
                                                                    title="AI Rewrite Summary"
                                                                >
                                                                    {loadingSummaryImprove ? (
                                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                                                                    ) : (
                                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                                {(loadingSummaryImprove || summaryRewriteSuggestion) && (
                                    <div
                                        className="experience-ai-hover relative mt-2 rounded-sm border border-sky-300/70 bg-sky-50/70 px-2.5 py-2 text-left text-[#334155] shadow-[0_8px_20px_rgba(14,165,233,0.08)]"
                                        style={{
                                            ...documentTextStyle,
                                            lineHeight: 1.45,
                                            fontFamily: "var(--font-body)",
                                            textAlign: "left"
                                        }}
                                    >
                                        {summaryRewriteSuggestion ? (
                                            <>
                                                {!summaryRewriteSuggestion.isStreaming && renderRewriteActionButtons({
                                                    onAccept: acceptSummaryRewriteSuggestion,
                                                    onReject: rejectSummaryRewriteSuggestion,
                                                    onAcceptHover: () => setRewriteActionHover({ target: "summary", action: "accept" }),
                                                    onRejectHover: () => setRewriteActionHover({ target: "summary", action: "reject" }),
                                                    onClearHover: () => setRewriteActionHover(null)
                                                })}
                                                <div className={`resume-rewrite-suggestion-text whitespace-pre-wrap ${getSuggestionReviewClass(summaryRewriteHoverAction || undefined)}`}>
                                                    {summaryRewriteSuggestion.suggestedText || (summaryRewriteSuggestion.isQueued ? "Queued summary rewrite..." : "Generating summary rewrite...")}
                                                </div>
                                                {summaryRewriteSuggestion.reason && !summaryRewriteSuggestion.isStreaming && (
                                                    <div className="mt-1 text-left text-[10px] leading-relaxed text-slate-500">
                                                        {summaryRewriteSuggestion.reason}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-left text-[10px] font-semibold tracking-wide text-shimmer-light">
                                                Generating summary rewrite...
                                            </div>
                                        )}
                                    </div>
                                )}
                            </DocumentSection>

                            {/* --- WORK EXPERIENCE --- */}
                            <DocumentSection
                                id="experience"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/experience-sec"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                        Work Experience
                                    </h2>
                                </div>

                                <div className="space-y-1.5">
                                    {(resumeData.experience || []).map((exp, idx) => {
                                        const expBullets = Array.isArray(exp.bullets) ? exp.bullets : [];
                                        const showExperienceItemControls = isExperienceSectionActive || hoveredJobId === exp.id;
                                        const isExperienceItemHovered = hoveredJobId === exp.id;
                                        const isExperienceImproveHovered = hoveredExperienceImproveId === exp.id;
                                        const isExperienceClearHovered = hoveredExperienceClearId === exp.id;
                                        const isExperienceDeleteHovered = hoveredExperienceDeleteId === exp.id;
                                        const pendingExperienceRewrite = experienceRewriteSuggestions[exp.id] || null;
                                        const isExperienceRewriteLoading = loadingExperienceImproveId === exp.id;
                                        const experienceMetaFields = [
                                            {
                                                key: "jobTitle",
                                                path: `experience.${idx}.jobTitle`,
                                                label: "Job Title",
                                                value: exp.jobTitle,
                                                placeholder: "Title",
                                                className: `${compactFitMetaInputClass} text-[#0f172a] font-bold`,
                                                style: getDynamicInputStyle(exp.jobTitle, "Title", "bold 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "jobTitle", val)
                                            },
                                            {
                                                key: "company",
                                                path: `experience.${idx}.company`,
                                                label: "Company Name",
                                                value: exp.company || "",
                                                placeholder: "Company Name",
                                                className: compactFitMetaInputClass,
                                                style: getDynamicInputStyle(exp.company || "", "Company Name", "600 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "company", val)
                                            },
                                            {
                                                key: "location",
                                                path: `experience.${idx}.location`,
                                                label: "City, State",
                                                value: exp.location || "",
                                                placeholder: "City, State",
                                                className: `${compactFitMetaInputClass} text-[#475569]`,
                                                style: getDynamicInputStyle(exp.location || "", "City, State", "600 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "location", val)
                                            }
                                        ].filter((field) => showExperienceItemControls || hasText(field.value));
                                        const experienceDateFields = [
                                            {
                                                key: "startDate",
                                                path: `experience.${idx}.startDate`,
                                                label: "Start Date",
                                                value: exp.startDate || "",
                                                placeholder: "Start",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(exp.startDate || "", "Start", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "startDate", val)
                                            },
                                            {
                                                key: "endDate",
                                                path: `experience.${idx}.endDate`,
                                                label: "End Date",
                                                value: exp.endDate || "",
                                                placeholder: "End",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(exp.endDate || "", "End", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateExperienceField(exp.id, "endDate", val)
                                            }
                                        ].filter((field) => showExperienceItemControls || hasText(field.value));
                                        if (!showExperienceItemControls && experienceMetaFields.length === 0 && experienceDateFields.length === 0 && expBullets.length === 0) {
                                            return null;
                                        }

                                        return (
                                            <React.Fragment key={exp.id}>
                                            <div
                                                onMouseEnter={() => setHoveredJobId(exp.id)}
                                                onMouseLeave={() => setHoveredJobId(null)}
                                                className={`relative group/job border border-transparent rounded-sm transition-colors ${showExperienceItemControls ? "bg-white px-1.5 py-1" : "p-0 hover:border-slate-200 hover:bg-slate-50"} ${isExperienceImproveHovered ? "experience-ai-hover" : ""} ${isExperienceClearHovered ? "experience-clear-hover bg-slate-500/10" : ""} ${isExperienceDeleteHovered ? "experience-delete-hover bg-red-500/10" : ""}`}
                                                style={showExperienceItemControls ? {
                                                    borderColor: isExperienceImproveHovered
                                                        ? "transparent"
                                                        : isExperienceDeleteHovered
                                                        ? "rgba(220, 38, 38, 0.72)"
                                                        : isExperienceClearHovered
                                                        ? "rgba(100, 116, 139, 0.72)"
                                                        : isExperienceItemHovered
                                                        ? "rgba(96, 165, 250, 0.78)"
                                                        : "rgba(30, 64, 175, 0.52)"
                                                } : undefined}
                                            >
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredExperienceImproveId(exp.id)}
                                                    onMouseLeave={() => setHoveredExperienceImproveId(null)}
                                                    onClick={() => handleImproveExperience(exp)}
                                                    disabled={Boolean(pendingExperienceRewrite?.isStreaming) || expBullets.length === 0}
                                                    className={`${experienceMarginImproveClass} top-0 disabled:cursor-not-allowed disabled:opacity-35`}
                                                    title="Improve work experience with AI"
                                                    aria-label="Improve work experience with AI"
                                                >
                                                    {loadingExperienceImproveId === exp.id ? (
                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-slate-400"></div>
                                                    ) : (
                                                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                                        </svg>
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredExperienceClearId(exp.id)}
                                                    onMouseLeave={() => setHoveredExperienceClearId(null)}
                                                    onClick={() => clearExperience(exp.id)}
                                                    className={`${experienceMarginClearClass} top-0`}
                                                    title="Clear work experience"
                                                    aria-label="Clear work experience"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9l-6 6M12 9l6 6" />
                                                    </svg>
                                                </button>
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredExperienceDeleteId(exp.id)}
                                                    onMouseLeave={() => setHoveredExperienceDeleteId(null)}
                                                    onClick={() => removeExperience(exp.id)}
                                                    className={`${experienceMarginDeleteClass} top-7`}
                                                    title="Remove work experience"
                                                    aria-label="Remove work experience"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                    </svg>
                                                </button>

                                                {(showExperienceItemControls || experienceMetaFields.length > 0 || experienceDateFields.length > 0) && (
                                                    <div
                                                        className="mb-1.5 flex justify-between items-center gap-4 whitespace-nowrap overflow-visible relative z-30"
                                                        style={{ fontFamily: "var(--font-subheading)" }}
                                                    >
                                                        <div className="flex items-center gap-1.5 overflow-visible">
                                                            {experienceMetaFields.map((field, fieldIdx) => (
                                                                <React.Fragment key={field.key}>
                                                                    {fieldIdx > 0 && <span className={resumeDividerClass} style={documentTextStyle}>|</span>}
                                                                    {renderOverlayInput({
                                                                        path: field.path,
                                                                        label: field.label,
                                                                        value: field.value,
                                                                        placeholder: field.placeholder,
                                                                        className: field.className,
                                                                        style: field.style,
                                                                        onChange: field.onChange,
                                                                        disableClear: true
                                                                    })}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0 text-left overflow-visible">
                                                            {experienceDateFields.map((field, fieldIdx) => (
                                                                <React.Fragment key={field.key}>
                                                                    {fieldIdx > 0 && <span className="shrink-0 text-slate-400" style={documentTextStyle}>-</span>}
                                                                    {renderOverlayInput({
                                                                        path: field.path,
                                                                        label: field.label,
                                                                        value: field.value,
                                                                        placeholder: field.placeholder,
                                                                        className: field.className,
                                                                        style: field.style,
                                                                        onChange: field.onChange,
                                                                        disableClear: true
                                                                    })}
                                                                </React.Fragment>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Bullet Points */}
                                                <div className="space-y-0.5 ml-3 mt-1 relative z-20">
                                                    {expBullets.map((b, bulletIdx) => {
                                                        const bulletPath = `experience.${idx}.bullets.${bulletIdx}`;
                                                        const rewriteItem = pendingExperienceRewrite?.items.find((item) => item.bulletId === b.id);
                                                        const bulletRewriteHoverAction =
                                                            rewriteActionHover?.target === "experience" && rewriteActionHover.bulletId === b.id
                                                                ? rewriteActionHover.action
                                                                : null;
                                                        const bulletCurrentRewriteClass = bulletRewriteHoverAction === "accept"
                                                            ? "resume-rewrite-current-accept-hover"
                                                            : bulletRewriteHoverAction === "reject"
                                                            ? "resume-rewrite-current-reject-hover"
                                                            : "";
                                                        
                                                        return (
                                                            <React.Fragment key={b.id}>
                                                            <div
                                                                key={b.id}
                                                                className="relative group/bullet flex items-start gap-2 rounded-sm border border-transparent"
                                                            >
                                                                <span
                                                                    className="text-slate-600 select-none py-0.5 leading-[1.38]"
                                                                    style={{ ...documentTextStyle, display: "inline-block" }}
                                                                >
                                                                    &bull;
                                                                </span>
                                                                <div className="flex-1">
                                                                    {renderOverlayInput({
                                                                        path: bulletPath,
                                                                        label: "Bullet Point",
                                                                        value: b.text,
                                                                        placeholder: "Described high-impact action outcome...",
                                                                        className: `${inputStyleClass} text-[#334155] leading-[1.38] resize-none py-0.5 ${bulletCurrentRewriteClass}`,
                                                                        style: { ...documentTextStyle, whiteSpace: "pre-wrap", wordBreak: "break-word" },
                                                                        isAutoResize: true,
                                                                        showTextStats: true,
                                                                        onChange: (val) => updateBulletText(exp.id, b.id, val),
                                                                        onDelete: () => removeBullet(exp.id, b.id),
                                                                        disableClear: true,
                                                                        disableDelete: true
                                                                    })}
                                                                </div>
                                                            </div>
                                                            {(isExperienceRewriteLoading || rewriteItem) && (
                                                                <div className="relative ml-6 mt-1 mb-1">
                                                                    <div
                                                                        className="experience-ai-hover relative rounded-sm border border-sky-300/70 bg-sky-50/70 px-2.5 py-1.5 text-left text-[#334155] shadow-[0_8px_20px_rgba(14,165,233,0.08)]"
                                                                        style={{
                                                                            ...documentTextStyle,
                                                                            lineHeight: 1.38,
                                                                            fontFamily: "var(--font-body)",
                                                                            textAlign: "left"
                                                                        }}
                                                                    >
                                                                        {rewriteItem ? (
                                                                            <>
                                                                                {!rewriteItem.isStreaming && renderRewriteActionButtons({
                                                                                    onAccept: () => acceptExperienceRewriteSuggestion(exp.id, rewriteItem.bulletId),
                                                                                    onReject: () => rejectExperienceRewriteSuggestion(exp.id, rewriteItem.bulletId),
                                                                                    onAcceptHover: () => setRewriteActionHover({ target: "experience", bulletId: rewriteItem.bulletId, action: "accept" }),
                                                                                    onRejectHover: () => setRewriteActionHover({ target: "experience", bulletId: rewriteItem.bulletId, action: "reject" }),
                                                                                    onClearHover: () => setRewriteActionHover(null)
                                                                                })}
                                                                                    <div className={`resume-rewrite-suggestion-text whitespace-pre-wrap ${getSuggestionReviewClass(bulletRewriteHoverAction || undefined)}`}>
                                                                                        {rewriteItem.suggestedText || (rewriteItem.isQueued ? "Queued bullet rewrite..." : "Generating bullet rewrite...")}
                                                                                    </div>
                                                                                {rewriteItem.reason && !rewriteItem.isStreaming && (
                                                                                    <div className="mt-1 text-left text-[10px] leading-relaxed text-slate-500">
                                                                                        {rewriteItem.reason}
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        ) : (
                                                                            <div className="text-left text-[10px] font-semibold tracking-wide text-shimmer-light">
                                                                                Generating bullet rewrite...
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    {showExperienceItemControls && (
                                                        <div className="relative flex items-start gap-2 group/bullet">
                                                            <span
                                                                className="select-none py-0.5 leading-[1.38] text-slate-400"
                                                                style={{ ...documentTextStyle, display: "inline-block", marginTop: 1 }}
                                                            >
                                                                &bull;
                                                            </span>
                                                            <input
                                                                className={`${inputStyleClass} flex-1 border border-transparent bg-transparent py-0.5 leading-[1.38] text-slate-400 outline-none placeholder:text-slate-400 placeholder:italic`}
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val.trim()) {
                                                                        addBulletWithText(exp.id, val);
                                                                    }
                                                                }}
                                                                placeholder="Type to add a new bullet..."
                                                                style={documentTextStyle}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            </React.Fragment>
                                        );
                                    })}
                                    <div className={`resume-edit-control absolute left-0 bottom-0 h-0 w-full overflow-visible transition-opacity duration-300 ${
                                        activeDocumentSection === "experience"
                                            ? "opacity-100"
                                            : "opacity-0"
                                    }`} style={{ marginTop: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => insertExperienceAt((resumeData.experience || []).length)}
                                            className={`${experienceMarginAddClass} top-1/2 -translate-y-1/2`}
                                            title="Add experience"
                                            aria-label="Add experience at the bottom of Work Experience"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </DocumentSection>

                            {/* --- EDUCATION --- */}
                            <DocumentSection
                                id="education"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/education-sec"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                        Education
                                    </h2>
                                </div>

                                <div className="space-y-1.5">
                                    {(resumeData.education || []).map((ed) => {
                                        const isDeleteHovered = hoveredEducationDeleteId === ed.id;
                                        const showEducationFields = activeDocumentSection === "education";
                                        const educationMetaFields = [
                                            {
                                                key: "degree",
                                                path: `education.${ed.id}.degree`,
                                                label: "Degree / Major",
                                                value: ed.degree || "",
                                                placeholder: "Degree / Major",
                                                className: `${compactFitMetaInputClass} text-[#0f172a] font-bold`,
                                                style: getDynamicInputStyle(ed.degree || "", "Degree / Major", "bold 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "degree", val)
                                            },
                                            {
                                                key: "school",
                                                path: `education.${ed.id}.school`,
                                                label: "Institution Name",
                                                value: ed.school,
                                                placeholder: "Institution Name",
                                                className: compactFitMetaInputClass,
                                                style: getDynamicInputStyle(ed.school, "Institution Name", "600 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "school", val)
                                            }
                                        ].filter((field) => showEducationFields || hasText(field.value));
                                        const educationDateFields = [
                                            {
                                                key: "startDate",
                                                path: `education.${ed.id}.startDate`,
                                                label: "Start Date",
                                                value: ed.startDate || "",
                                                placeholder: "Start",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(ed.startDate || "", "Start", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "startDate", val)
                                            },
                                            {
                                                key: "endDate",
                                                path: `education.${ed.id}.endDate`,
                                                label: "End Date",
                                                value: ed.endDate || "",
                                                placeholder: "End",
                                                className: `${compactFitDateInputClass} text-left`,
                                                style: getDynamicInputStyle(ed.endDate || "", "End", "500 12px Poppins, Arial, sans-serif"),
                                                onChange: (val: string) => updateEducationField(ed.id, "endDate", val)
                                            }
                                        ].filter((field) => showEducationFields || hasText(field.value));
                                        const educationDetails = Array.isArray(ed.details) ? ed.details : [];
                                        const visibleEducationDetails = educationDetails.filter((detail) => showEducationFields || hasText(detail.text));
                                        if (!showEducationFields && educationMetaFields.length === 0 && educationDateFields.length === 0 && visibleEducationDetails.length === 0) {
                                            return null;
                                        }
                                        return (
                                            <div
                                                key={ed.id}
                                                className={`relative group/edu rounded-sm border transition-all duration-200 ${activeDocumentSection === "education" ? "px-1.5 py-1" : "p-0"} ${
                                                    isDeleteHovered
                                                        ? "experience-delete-hover bg-red-500/10"
                                                        : activeDocumentSection === "education"
                                                        ? "bg-white border-blue-800/40 hover:border-sky-400"
                                                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                                }`}
                                                style={isDeleteHovered ? { borderColor: "rgba(220, 38, 38, 0.72)" } : undefined}
                                            >
                                                {/* Delete Edu (Icon only) */}
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredEducationDeleteId(ed.id)}
                                                    onMouseLeave={() => setHoveredEducationDeleteId(null)}
                                                    onClick={() => removeEducation(ed.id)}
                                                    className={`edu-delete-button resume-edit-control absolute -right-9 top-1/2 -translate-y-1/2 z-[100] !inline-flex h-5 !h-5 w-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-red-500 shadow-none transition-[background,border-color,color,opacity,transform] duration-150 hover:!bg-red-500/10 hover:!text-red-600 active:scale-95 cursor-pointer ${
                                                        activeDocumentSection === "education" ? "opacity-70 hover:opacity-100" : "pointer-events-none opacity-0"
                                                    }`}
                                                    title="Remove education"
                                                    aria-label="Remove education"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                    </svg>
                                                </button>

                                            {(showEducationFields || educationMetaFields.length > 0 || educationDateFields.length > 0) && (
                                                <div
                                                    className="flex justify-between items-center gap-4 whitespace-nowrap overflow-visible relative z-30"
                                                    style={{ fontFamily: "var(--font-subheading)" }}
                                                >
                                                    <div className="flex items-center gap-1.5 overflow-visible">
                                                        {educationMetaFields.map((field, fieldIdx) => (
                                                            <React.Fragment key={field.key}>
                                                                {fieldIdx > 0 && <span className={resumeDividerClass} style={documentTextStyle}>|</span>}
                                                                {renderOverlayInput({
                                                                    path: field.path,
                                                                    label: field.label,
                                                                    value: field.value,
                                                                    placeholder: field.placeholder,
                                                                    className: field.className,
                                                                    style: field.style,
                                                                    onChange: field.onChange,
                                                                    disableClear: true
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0 text-left">
                                                        {educationDateFields.map((field, fieldIdx) => (
                                                            <React.Fragment key={field.key}>
                                                                {fieldIdx > 0 && <span className="shrink-0 text-slate-400" style={documentTextStyle}>-</span>}
                                                                {renderOverlayInput({
                                                                    path: field.path,
                                                                    label: field.label,
                                                                    value: field.value,
                                                                    placeholder: field.placeholder,
                                                                    className: field.className,
                                                                    style: field.style,
                                                                    onChange: field.onChange,
                                                                    disableClear: true
                                                                })}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(visibleEducationDetails.length > 0 || showEducationFields) && (
                                                <div className="ml-3 mt-1 space-y-0.5 relative z-20">
                                                    {visibleEducationDetails.map((detail, detailIdx) => (
                                                        <div key={detail.id} className="relative flex items-start gap-2 rounded-sm border border-transparent">
                                                            <span
                                                                className="text-slate-600 select-none py-0.5 leading-[1.38]"
                                                                style={{ ...documentTextStyle, display: "inline-block" }}
                                                            >
                                                                &bull;
                                                            </span>
                                                            <div className="flex-1">
                                                                {renderOverlayInput({
                                                                    path: `education.${ed.id}.details.${detailIdx}`,
                                                                    label: "Education Detail",
                                                                    value: detail.text,
                                                                    placeholder: "Concentration, honors, coursework, or other detail...",
                                                                    className: `${inputStyleClass} text-[#334155] leading-[1.38] resize-none py-0.5`,
                                                                    style: { ...documentTextStyle, whiteSpace: "pre-wrap", wordBreak: "break-word" },
                                                                    isAutoResize: true,
                                                                    showTextStats: true,
                                                                    onChange: (val) => updateEducationDetailText(ed.id, detail.id, val),
                                                                    disableClear: true,
                                                                    disableDelete: true
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {showEducationFields && (
                                                        <div className="relative flex items-start gap-2">
                                                            <span
                                                                className="select-none py-0.5 leading-[1.38] text-slate-400"
                                                                style={{ ...documentTextStyle, display: "inline-block", marginTop: 1 }}
                                                            >
                                                                &bull;
                                                            </span>
                                                            <input
                                                                className={`${inputStyleClass} flex-1 border border-transparent bg-transparent py-0.5 leading-[1.38] text-slate-400 outline-none placeholder:text-slate-400 placeholder:italic`}
                                                                value=""
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val.trim()) {
                                                                        addEducationDetailWithText(ed.id, val);
                                                                    }
                                                                }}
                                                                placeholder="Type to add concentration, honors, coursework..."
                                                                style={documentTextStyle}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        );
                                    })}
                                    <div className={`resume-edit-control absolute left-0 bottom-0 h-0 w-full overflow-visible transition-opacity duration-300 ${
                                        activeDocumentSection === "education"
                                            ? "opacity-100"
                                            : "opacity-0"
                                    }`} style={{ marginTop: 0 }}>
                                        <button
                                            type="button"
                                            onClick={addEducation}
                                            className={`resume-edit-control absolute -left-9 top-1/2 -translate-y-1/2 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 cursor-pointer ${
                                                activeDocumentSection === "education" ? "opacity-100" : "pointer-events-none opacity-0"
                                            }`}
                                            title="Add education"
                                            aria-label="Add education Category"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </DocumentSection>

                            {/* --- SKILLS --- */}
                            <DocumentSection
                                id="skills"
                                activeSection={activeDocumentSection}
                                setActiveSection={setActiveDocumentSection}
                                className="group/skills-sec"
                                style={documentSectionGapStyle}
                                showGapPreview={isSectionGapPreviewVisible}
                                gapPreviewHeight={documentSectionGapPx}
                            >
                                <div className="flex items-center gap-2">
                                    <h2 className={sectionHeadingClass} style={sectionHeadingStyle}>
                                        Skills
                                    </h2>
                                </div>
                                <div className="space-y-1">
                                    {(resumeData.skills || []).map((skill) => {
                                        const itemsPath = `skills.${skill.id}.items`;
                                        const isDeleteHovered = hoveredSkillDeleteId === skill.id;
                                        const showSkillFields = activeDocumentSection === "skills";
                                        const skillItemsText = getSkillItemsText(skill);
                                        const showSkillCategory = showSkillFields || hasText(skill.category);
                                        const showSkillItems = showSkillFields || hasText(skillItemsText);

                                        if (!showSkillCategory && !showSkillItems) return null;

                                        return (
                                            <div
                                                key={skill.id}
                                                className={`group/skill-row relative flex items-start gap-1.5 rounded-sm border transition-all duration-200 ${activeDocumentSection === "skills" ? "px-1.5 py-0.5" : "p-0"} ${
                                                    isDeleteHovered
                                                        ? "experience-delete-hover bg-red-500/10"
                                                        : activeDocumentSection === "skills"
                                                        ? "bg-white border-blue-800/40 hover:border-sky-400"
                                                        : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                                                }`}
                                                style={isDeleteHovered ? { borderColor: "rgba(220, 38, 38, 0.72)" } : undefined}
                                            >
                                                {showSkillCategory && renderOverlayInput({
                                                    path: `skills.${skill.id}.category`,
                                                    label: "Skill Category",
                                                    value: skill.category,
                                                    placeholder: "Category",
                                                    className: `${compactFitMetaInputClass} text-[#0f172a] font-bold`,
                                                    style: getDynamicInputStyle(skill.category, "Category", "bold 12px Poppins, Arial, sans-serif"),
                                                    onChange: (val) => updateSkillCategoryName(skill.id, val),
                                                    disableClear: true
                                                })}
                                                {showSkillCategory && showSkillItems && <span className="shrink-0 pt-1 font-bold leading-none text-[#0f172a]" style={documentTextStyle}>:</span>}
                                                {showSkillItems && renderOverlayInput({
                                                    path: itemsPath,
                                                    label: "Skills",
                                                    value: skillItemsText,
                                                    placeholder: "TypeScript, Python, Swift, React Native, Go",
                                                    className: `${inputStyleClass} text-[#334155] font-normal leading-[1.38] resize-none overflow-hidden py-0.5`,
                                                    style: {
                                                        ...documentTextStyle,
                                                        width: "100%",
                                                        minWidth: 0,
                                                        maxWidth: "100%",
                                                        fontWeight: "400",
                                                        whiteSpace: "pre-wrap",
                                                        wordBreak: "break-word"
                                                    },
                                                    onChange: (val) => updateSkillCategoryItems(skill.id, val),
                                                    disableClear: true,
                                                    isAutoResize: true,
                                                    containerClassName: "min-w-0 flex-1",
                                                    inputContainerClassName: "w-full items-start"
                                                })}
                                                <button
                                                    type="button"
                                                    onMouseEnter={() => setHoveredSkillDeleteId(skill.id)}
                                                    onMouseLeave={() => setHoveredSkillDeleteId(null)}
                                                    onClick={() => removeSkillCategory(skill.id)}
                                                    className={`skill-delete-button resume-edit-control absolute -right-9 top-1/2 -translate-y-1/2 z-[100] !inline-flex h-5 !h-5 w-5 !w-5 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-red-500 shadow-none transition-[background,border-color,color,opacity,transform] duration-150 hover:!bg-red-500/10 hover:!text-red-600 active:scale-95 cursor-pointer ${
                                                        activeDocumentSection === "skills" ? "opacity-70 hover:opacity-100" : "pointer-events-none opacity-0"
                                                    }`}
                                                    title="Delete skill category"
                                                    aria-label="Delete skill category"
                                                >
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.75">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <div className={`resume-edit-control absolute left-0 bottom-0 h-0 w-full overflow-visible transition-opacity duration-300 ${
                                        activeDocumentSection === "skills"
                                            ? "opacity-100"
                                            : "opacity-0"
                                    }`} style={{ marginTop: 0 }}>
                                        <button
                                            type="button"
                                            onClick={addSkillCategory}
                                            className={`resume-edit-control absolute -left-9 top-1/2 -translate-y-1/2 z-10 !inline-flex h-6 !h-6 w-6 !w-6 shrink-0 items-center justify-center rounded-md border border-transparent !bg-transparent !p-0 !text-emerald-600 shadow-none transition-[opacity,background,border-color,color,transform] duration-150 hover:!bg-slate-500/10 hover:border-slate-400/20 hover:!text-emerald-600 active:scale-95 cursor-pointer ${
                                                activeDocumentSection === "skills" ? "opacity-100" : "pointer-events-none opacity-0"
                                            }`}
                                            title="Add skill category"
                                            aria-label="Add skill category"
                                        >
                                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth="3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </DocumentSection>
                        </div>
                        </div>
                    </div>

                </div>
                <AnimatePresence>
                    {isPageStyleShelfOpen && (
                        <motion.div
                            className={`resume-page-style-shelf resume-edit-control absolute bottom-16 left-1/2 z-20 flex h-[88px] w-fit max-w-[calc(100%-3rem)] -translate-x-1/2 items-center rounded-md border px-4 py-0 print:hidden ${
                                isLightMode
                                    ? "border-slate-300/80 bg-white/82 shadow-[0_10px_24px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.86)]"
                                    : "border-white/14 bg-slate-950/72 shadow-[0_10px_24px_rgba(2,6,23,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]"
                            } ${isPageStyleShelfCompact ? "is-compact" : ""}`}
                            initial={{ y: 18, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 18, opacity: 0 }}
                            transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                            style={shelfSurfaceStyle}
                        >
                            <div className="resume-page-style-shelf-layout flex h-full w-max items-stretch gap-4 leading-none">
                                <div
                                    className={`resume-page-style-shelf-section resume-page-style-shelf-page-format ${shelfSectionClass} shrink-0`}
                                    onMouseEnter={() => setIsPageFormatPreviewVisible(true)}
                                    onMouseLeave={() => setIsPageFormatPreviewVisible(false)}
                                >
                                    <div className={shelfSectionTitleClass}>Page Format</div>
                                    <div className="flex w-fit flex-col items-center gap-1.5">
                                        <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>{PAPER_SIZES[pageSize].standardLabel}</span>
                                        <div className={shelfSegmentGroupClass} role="group" aria-label="Page size">
                                            {(["a4", "letter"] as PageSize[]).map((size) => (
                                                <button
                                                    key={size}
                                                    type="button"
                                                    onClick={() => setPageSize(size)}
                                                    className={`${shelfSegmentButtonClass} ${pageSize === size ? isLightMode ? "!text-sky-700" : "!text-sky-100" : ""}`}
                                                    title={`Use ${PAPER_SIZES[size].standardLabel} page size`}
                                                    aria-label={`Use ${PAPER_SIZES[size].standardLabel} page size`}
                                                    aria-pressed={pageSize === size}
                                                >
                                                    {size === "a4" ? "A4" : "Letter"}
                                                    {pageSize === size && (
                                                        <motion.span
                                                            layoutId="page-size-shelf-indicator"
                                                            className={shelfSegmentIndicatorClass}
                                                            transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className={`resume-page-style-shelf-divider ${shelfDividerClass}`} />
                                <div className={`resume-page-style-shelf-section resume-page-style-shelf-font ${shelfSectionClass} min-w-0 flex-1 items-center px-2`}>
                                    <div className={`${shelfSectionTitleClass} self-center text-center`}>Font Size</div>
                                    <div className="resume-page-style-shelf-font-controls grid grid-cols-3 justify-center gap-x-3">
                                        <div
                                            className={`resume-page-style-shelf-title-size ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setFontPreviewTarget("title")}
                                            onMouseLeave={() => setFontPreviewTarget(null)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Title</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setTitleFontSize((value) => clampNumber(value - 1, 18, 34))} disabled={titleFontSize <= 18} aria-label="Decrease title font size"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{titleFontSize}</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setTitleFontSize((value) => clampNumber(value + 1, 18, 34))} disabled={titleFontSize >= 34} aria-label="Increase title font size"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                        <div
                                            className={`resume-page-style-shelf-header-size ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setFontPreviewTarget("header")}
                                            onMouseLeave={() => setFontPreviewTarget(null)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Header</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setHeaderFontSize((value) => clampNumber(value - 1, 12, 22))} disabled={headerFontSize <= 12} aria-label="Decrease header font size"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{headerFontSize}</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setHeaderFontSize((value) => clampNumber(value + 1, 12, 22))} disabled={headerFontSize >= 22} aria-label="Increase header font size"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                        <div
                                            className={`resume-page-style-shelf-body-size ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setFontPreviewTarget("body")}
                                            onMouseLeave={() => setFontPreviewTarget(null)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Body</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setBodyFontSize((value) => clampNumber(value - 0.5, 9, 15))} disabled={bodyFontSize <= 9} aria-label="Decrease body font size"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{bodyFontSize}</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setBodyFontSize((value) => clampNumber(value + 0.5, 9, 15))} disabled={bodyFontSize >= 15} aria-label="Increase body font size"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`resume-page-style-shelf-divider ${shelfDividerClass}`} />
                                <div className={`resume-page-style-shelf-section resume-page-style-shelf-spacing ${shelfSectionClass} shrink-0`}>
                                    <div className={shelfSectionTitleClass}>Spacing</div>
                                    <div className="resume-page-style-shelf-spacing-controls flex w-fit items-start gap-4">
                                        <div
                                            className={`resume-page-style-shelf-margins ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setIsMarginPreviewVisible(true)}
                                            onMouseLeave={() => setIsMarginPreviewVisible(false)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Margins</span>
                                            <div className={shelfStepperRowClass}>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setPageMarginPt((value) => clampNumber(value - 2, 24, 60))} disabled={pageMarginPt <= 24} aria-label="Decrease page margins"><ShelfMinusIcon /></button>
                                                <span className={shelfStepperValueClass}>{pageMarginPt}pt</span>
                                                <button type="button" className={shelfStepperButtonClass} onClick={() => setPageMarginPt((value) => clampNumber(value + 2, 24, 60))} disabled={pageMarginPt >= 60} aria-label="Increase page margins"><ShelfPlusIcon /></button>
                                            </div>
                                        </div>
                                        <div
                                            className={`resume-page-style-shelf-section-gap ${shelfStepperControlClass}`}
                                            onMouseEnter={() => setIsSectionGapPreviewVisible(true)}
                                            onMouseLeave={() => setIsSectionGapPreviewVisible(false)}
                                        >
                                            <span className={`${shelfControlLabelClass} ${shelfStepperLabelClass}`}>Section Gap</span>
                                            <div className={shelfSegmentGroupClass} role="group" aria-label="Section gap">
                                                {(["compact", "standard", "relaxed"] as PaperLayoutFormat[]).map((format) => (
                                                    <button
                                                        key={format}
                                                        type="button"
                                                        onClick={() => setPaperLayoutFormat(format)}
                                                        className={`${shelfSegmentButtonClass} ${paperLayoutFormat === format ? isLightMode ? "!text-sky-700" : "!text-sky-100" : ""}`}
                                                        title={`${format[0].toUpperCase()}${format.slice(1)} layout spacing`}
                                                        aria-label={`${format[0].toUpperCase()}${format.slice(1)} layout spacing`}
                                                        aria-pressed={paperLayoutFormat === format}
                                                    >
                                                        {format[0].toUpperCase()}{format.slice(1)}
                                                        {paperLayoutFormat === format && (
                                                            <motion.span
                                                                layoutId="section-gap-shelf-indicator"
                                                                className={shelfSegmentIndicatorClass}
                                                                transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <div
                    className={`resume-edit-control absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-px rounded-md border px-1.5 py-0.5 print:hidden ${
                        isLightMode
                            ? "border-slate-300/80 bg-white/82 shadow-[0_12px_28px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.86)]"
                            : "border-white/18 bg-slate-950/58 shadow-[0_12px_28px_rgba(2,6,23,0.38),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(15,23,42,0.56)]"
                    }`}
                    style={toolbarSurfaceStyle}
                >
                    <button
                        type="button"
                        onClick={handleTogglePageStyleShelf}
                        className={`${documentToolButtonClass} ${isPageStyleShelfOpen ? isLightMode ? "!text-sky-700 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]" : "!text-sky-200 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]" : ""}`}
                        title={isPageStyleShelfOpen ? "Close page style shelf" : "Open page style shelf"}
                        aria-label={isPageStyleShelfOpen ? "Close page style shelf" : "Open page style shelf"}
                        aria-pressed={isPageStyleShelfOpen}
                    >
                        <svg className={headerActionIconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
                            <rect x="5" y="7" width="14" height="10" rx="2.4" />
                            <path strokeLinecap="round" d="M9 15h6" />
                        </svg>
                    </button>
                    <div className={`h-3.5 w-px ${isLightMode ? "bg-slate-300" : "bg-white/12"}`} />
                    <button
                        type="button"
                        onClick={handleFitZoom}
                        className={`${documentToolButtonClass} ${zoomMode === "fit" ? isLightMode ? "!bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]" : "!bg-sky-400/18 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]" : ""}`}
                        title="Fit page to available workspace"
                        aria-label="Fit page to available workspace"
                        aria-pressed={zoomMode === "fit"}
                    >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l6 6M21 3l-6 6M3 21l6-6M21 21l-6-6" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setZoomMode("manual");
                            setManualZoom(1);
                        }}
                        className={`${documentToolButtonClass} ${zoomMode === "manual" && manualZoom === 1 ? isLightMode ? "!bg-sky-100 text-sky-800 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.22)]" : "!bg-sky-400/18 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.28)]" : ""}`}
                        title="Set zoom to 100%"
                        aria-label="Set zoom to 100%"
                    >
                        <span className="text-[7px] font-medium leading-none tracking-normal">1:1</span>
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                setZoomMode("manual");
                                setManualZoom((value) => clampZoom(value - ZOOM_STEP));
                            }}
                            className={documentToolButtonClass}
                            title="Zoom out"
                            aria-label="Zoom out"
                        >
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                            </svg>
                        </button>
                        <span className={`min-w-9 px-1 text-center text-[7px] font-medium tracking-normal ${isLightMode ? "text-slate-700" : "text-slate-300"}`}>{zoomPercent}%</span>
                        <button
                            type="button"
                            onClick={() => {
                                setZoomMode("manual");
                                setManualZoom((value) => clampZoom(value + ZOOM_STEP));
                            }}
                            className={documentToolButtonClass}
                            title="Zoom in"
                            aria-label="Zoom in"
                        >
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                            </svg>
                        </button>
                    </div>
                </div>
            </main>
            {/* RIGHT RAIL: AI Copilot Dashboard */}
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
            </div>
        </div>
    );
}

export default Resume;
