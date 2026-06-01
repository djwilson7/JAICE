export type ResumeBullet = {
    id: string;
    text: string;
};

export type ExperienceItem = {
    id: string;
    jobTitle: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    bullets: ResumeBullet[];
};

export type EducationItem = {
    id: string;
    school: string;
    degree?: string;
    startDate?: string;
    endDate?: string;
    details?: ResumeBullet[];
};

export type SkillCategory = {
    id: string;
    category: string;
    items: string[];
    rawItems?: string;
};

export type ContactFieldKey = "location" | "phone" | "email" | "linkedin" | "website" | "github";

export type CustomContactField = {
    label: string;
    value: string;
};

export type ContactRenderField =
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

export type ResumeData = {
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

export type ResumeDataInput = Partial<Omit<ResumeData, "skills">> & {
    skills?: unknown;
};

export type ResumeFormatting = {
    pageSize: PageSize;
    titleFontSize: number;
    headerFontSize: number;
    bodyFontSize: number;
    pageMarginPt: number;
    paperLayoutFormat: PaperLayoutFormat;
};

export type SavedResume = {
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

export type ChangeMetadata = {
    path: string;
    before: string;
    after: string;
    reason: string;
};

export type ResumeChatIntent = "conversation" | "analysis" | "tailor_suggestions";

export type ResumeChatMessage = {
    sender: "user" | "assistant";
    text: string;
    intent?: ResumeChatIntent;
    analysis?: ResumeChatAnalysis | null;
    tailorSuggestions?: ResumeChatTailorSuggestions | null;
};

export type ResumeChatAnalysis = {
    match_score: number;
    requirements: string[];
    overlap: string[];
    gaps: string[];
    missing_keywords: string[];
    suggestions: string[];
};

export type ResumeChatTailorSuggestions = {
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

export type ResumeChatStreamEvent = {
    event: "intent" | "delta" | "structured" | "error" | "done";
    intent?: ResumeChatIntent;
    text?: string;
    analysis?: ResumeChatAnalysis | null;
    tailor_suggestions?: ResumeChatTailorSuggestions | null;
    message?: string;
};

export type ResumeRewriteSectionRequest = {
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

export type ResumeRewriteStreamEvent = {
    event: "delta" | "structured" | "error" | "done";
    target?: "summary" | "experience";
    bullet_index?: number | null;
    text?: string;
    assistant_message?: string;
    tailor_suggestions?: ResumeChatTailorSuggestions | null;
    message?: string;
};

export type ResumeRewriteSuggestion =
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

export type SummaryRewriteSuggestion = Extract<ResumeRewriteSuggestion, { target: "summary" }>;
export type ExperienceRewriteSuggestion = Extract<ResumeRewriteSuggestion, { target: "experience" }>;
export type ExperienceRewriteItem = ExperienceRewriteSuggestion["items"][number];

export type ResumeRewriteActionHover =
    | {
        target: "summary";
        action: "accept" | "reject";
    }
    | {
        target: "experience";
        bulletId: string;
        action: "accept" | "reject";
    };

export type ApiError = Error & {
    status?: number;
    detail?: string;
};

export type PageSize = "a4" | "letter";
export type ZoomMode = "fit" | "manual";
export type DocumentSectionId = "header" | "summary" | "experience" | "education" | "skills";
export type PaperLayoutFormat = "compact" | "standard" | "relaxed";
export type FontPreviewTarget = "title" | "header" | "body";

export type PaperMetrics = {
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

