import React, { useEffect, useMemo, useRef, useState } from "react";
import { normalizeTagSlug } from "../resumeData";
import type { ResumeTag } from "../types";

const TAG_COLORS: Record<string, { color: string; background: string }> = {
    "tag-teal": { color: "#0f766e", background: "#ccfbf1" },
    "tag-orange": { color: "#c2410c", background: "#ffedd5" },
    "tag-purple": { color: "#7e22ce", background: "#f3e8ff" },
    "tag-cyan": { color: "#0e7490", background: "#cffafe" },
    "tag-rose": { color: "#be123c", background: "#ffe4e6" },
    "tag-slate": { color: "#475569", background: "#e2e8f0" },
    "tag-fuchsia": { color: "#a21caf", background: "#fae8ff" },
    "tag-violet": { color: "#4f46e5", background: "#e0e7ff" },
    "tag-pink": { color: "#db2777", background: "#fce7f3" },
    "tag-zinc": { color: "#52525b", background: "#e4e4e7" },
    "tag-stone": { color: "#57534e", background: "#e7e5e4" }
};

const editDistance = (left: string, right: string): number => {
    const rows = Array.from({ length: left.length + 1 }, (_, index) => index);
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
        let previous = rows[0];
        rows[0] = rightIndex;
        for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
            const current = rows[leftIndex];
            rows[leftIndex] = Math.min(
                rows[leftIndex] + 1,
                rows[leftIndex - 1] + 1,
                previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
            );
            previous = current;
        }
    }
    return rows[left.length];
};

const getTagMatchScore = (tag: ResumeTag, input: string): number | null => {
    const slug = normalizeTagSlug(input);
    if (!slug) return 0;
    if (tag.slug === slug) return 0;
    if (tag.slug.startsWith(slug)) return 10 + (tag.slug.length - slug.length);
    if (tag.slug.includes(slug)) return 20 + tag.slug.indexOf(slug);
    if (slug.includes(tag.slug)) return 30 + (slug.length - tag.slug.length);

    const distance = editDistance(tag.slug, slug);
    const allowedDistance = Math.max(1, Math.floor(slug.length * 0.25));
    return distance <= allowedDistance ? 40 + distance : null;
};

type ExperienceBulletTagsProps = {
    bulletId: string;
    tagIds: string[];
    tags: ResumeTag[];
    isEditing: boolean;
    focusPath: string;
    textStyle: React.CSSProperties;
    onSectionHoverChange: (isHovering: boolean) => void;
    onToggleTag: (tagId: string) => void;
    onCreateTag: (name: string) => void;
    onDeleteTag: (tagId: string) => void;
    onPreviewTag: (tag: ResumeTag | null) => void;
    onFocusChange: (fieldPath: string | null) => void;
};

export const ExperienceBulletTags: React.FC<ExperienceBulletTagsProps> = ({
    bulletId,
    tagIds,
    tags,
    isEditing,
    focusPath,
    textStyle,
    onSectionHoverChange,
    onToggleTag,
    onCreateTag,
    onDeleteTag,
    onPreviewTag,
    onFocusChange
}) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [previewTag, setPreviewTag] = useState<ResumeTag | null>(null);
    const activeTags = tags.filter((tag) => tagIds.includes(tag.id) && !tag.archivedAt);
    const displayedTags = previewTag ? [previewTag] : activeTags;
    const suggestions = useMemo(
        () => tags
            .filter((tag) => !tag.archivedAt)
            .map((tag) => ({ tag, score: getTagMatchScore(tag, query) }))
            .filter((match): match is { tag: ResumeTag; score: number } => match.score !== null)
            .sort((left, right) => left.score - right.score || left.tag.name.localeCompare(right.tag.name))
            .slice(0, 8)
            .map((match) => match.tag),
        [query, tags]
    );
    const normalizedQuery = normalizeTagSlug(query);
    const hasExactTag = tags.some((tag) => tag.slug === normalizedQuery);
    const cleanQuery = query.trim().replace(/\s+/g, "");

    useEffect(() => {
        if (!isOpen) return;
        const closeOnOutsideClick = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
                setQuery("");
                setPreviewTag(null);
                onPreviewTag(null);
                onFocusChange(null);
            }
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [isOpen, onFocusChange, onPreviewTag]);

    if (!isEditing) return null;

    const openMenu = () => {
        activeTags.forEach((tag) => onToggleTag(tag.id));
        setIsOpen(true);
        onFocusChange(focusPath);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const closeMenu = () => {
        setIsOpen(false);
        setQuery("");
        setPreviewTag(null);
        onPreviewTag(null);
        onFocusChange(null);
    };

    const handleCreateTag = (name: string) => {
        onCreateTag(name);
        closeMenu();
    };

    const handleToggleTag = (tagId: string) => {
        onToggleTag(tagId);
        closeMenu();
    };

    const handleDeleteTag = (tagId: string) => {
        onDeleteTag(tagId);
        setPreviewTag(null);
        onPreviewTag(null);
        setQuery("");
    };

    const handlePreviewTag = (tag: ResumeTag | null) => {
        setPreviewTag(tag);
        onPreviewTag(tag);
    };

    return (
        <div
            ref={rootRef}
            className="resume-edit-control absolute right-full top-0 z-[95] mr-8 flex min-h-5 w-28 justify-start"
            data-bullet-tags={bulletId}
            onMouseEnter={() => onSectionHoverChange(true)}
            onMouseLeave={() => onSectionHoverChange(false)}
        >
            <button
                type="button"
                className="resume-tag-trigger group/tag-trigger inline-flex w-full items-start justify-start text-left font-normal leading-tight"
                style={{ fontFamily: textStyle.fontFamily || "var(--font-body)" }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={openMenu}
                aria-label="Edit bullet tags"
                title={displayedTags.length ? displayedTags.map((tag) => tag.name).join(", ") : "Set Tag"}
            >
                {displayedTags.length > 0 && (
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                        {displayedTags.map((tag) => {
                            const color = TAG_COLORS[tag.colorToken]?.color || "#475569";
                            return (
                                <span
                                    key={tag.id}
                                    className="resume-tag-label resume-tag-label-active"
                                    style={{
                                        "--resume-tag-color": color,
                                        "--resume-tag-bg": color
                                    } as React.CSSProperties}
                                >
                                    <span className="resume-tag-label-text">{tag.name}</span>
                                    <span className="resume-tag-action-icon resume-tag-delete-icon" aria-hidden="true">
                                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.75">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                        </svg>
                                    </span>
                                </span>
                            );
                        })}
                    </span>
                )}
                {displayedTags.length === 0 && (
                    <span className="resume-tag-label resume-tag-label-empty">
                        <span className="resume-tag-label-text">Add Tag</span>
                        <span className="resume-tag-action-icon resume-tag-add-icon" aria-hidden="true">
                            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                            </svg>
                        </span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    className="resume-tag-menu-panel absolute right-full top-0 mr-2 flex w-52 flex-col gap-0.5 text-left"
                    data-tag-menu-placement="canvas-left"
                    role="menu"
                >
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value.replace(/\s+/g, ""))}
                        onFocus={() => onFocusChange(focusPath)}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setIsOpen(false);
                                setQuery("");
                                setPreviewTag(null);
                                onPreviewTag(null);
                                onFocusChange(null);
                            }
                            if (event.key === "Enter" && cleanQuery && !hasExactTag) {
                                event.preventDefault();
                                handleCreateTag(cleanQuery);
                            }
                        }}
                        className="resume-tag-menu-input"
                        placeholder="Search or create tag"
                        aria-label="Tag name"
                    />
                    <div className="max-h-36 overflow-y-auto">
                        {cleanQuery && !hasExactTag && (
                                <button
                                    type="button"
                                    className="resume-tag-menu-option"
                                    onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    handleCreateTag(cleanQuery);
                                }}
                                aria-label={`Create ${cleanQuery} tag`}
                                role="menuitem"
                            >
                                <span className="resume-tag-menu-create-label truncate">Add "{cleanQuery}"</span>
                                <svg className="h-3 w-3 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                                </svg>
                            </button>
                        )}
                        {suggestions.map((tag) => {
                            const selected = tagIds.includes(tag.id);
                            const colors = TAG_COLORS[tag.colorToken] || TAG_COLORS["tag-slate"];
                            return (
                                <div
                                    key={tag.id}
                                    className="resume-tag-menu-option resume-tag-menu-option-editable"
                                    role="menuitem"
                                >
                                    <button
                                        type="button"
                                        className="resume-tag-menu-delete-action"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            handleDeleteTag(tag.id);
                                        }}
                                        aria-label={`Delete ${tag.name} tag everywhere`}
                                        title="Delete tag everywhere"
                                    >
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5h6v2m-8 3 .7 9h8.6l.7-9" />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        className="resume-tag-menu-label-action"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => handleToggleTag(tag.id)}
                                        onMouseEnter={() => handlePreviewTag(tag)}
                                        onMouseLeave={() => handlePreviewTag(null)}
                                        onFocus={() => handlePreviewTag(tag)}
                                        onBlur={() => handlePreviewTag(null)}
                                        aria-label={selected ? `Remove ${tag.name} tag` : `Add ${tag.name} tag`}
                                    >
                                        <span
                                            className="resume-tag-menu-label-pill"
                                            style={{
                                                "--resume-tag-color": colors.color,
                                                "--resume-tag-bg": colors.color
                                            } as React.CSSProperties}
                                        >
                                            {tag.name}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
