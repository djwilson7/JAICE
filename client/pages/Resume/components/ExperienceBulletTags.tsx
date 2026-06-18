import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTagColorStyle, normalizeTagSlug } from "../resumeData";
import type { ResumeTag } from "../types";

const TAG_MENU_WIDTH_PX = 208;
const TAG_MENU_GAP_PX = 8;
const TAG_MENU_VIEWPORT_MARGIN_PX = 8;
const TAG_MENU_MIN_HEIGHT_PX = 224;
const TAG_MENU_MAX_HEIGHT_PX = 400;

type TagMenuPosition = {
    left: number;
    top: number;
    maxHeight: number;
    placement: "viewport-left" | "viewport-right";
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
    onSectionHoverChange,
    onToggleTag,
    onCreateTag,
    onDeleteTag,
    onPreviewTag,
    onFocusChange
}) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [previewTag, setPreviewTag] = useState<ResumeTag | null>(null);
    const [menuPosition, setMenuPosition] = useState<TagMenuPosition | null>(null);
    const activeTags = tags.filter((tag) => tagIds.includes(tag.id) && !tag.archivedAt);
    const displayedTags = previewTag ? [previewTag] : activeTags;
    const suggestions = useMemo(
        () => tags
            .filter((tag) => !tag.archivedAt)
            .map((tag) => ({ tag, score: getTagMatchScore(tag, query) }))
            .filter((match): match is { tag: ResumeTag; score: number } => match.score !== null)
            .sort((left, right) => left.score - right.score || left.tag.name.localeCompare(right.tag.name))
            .map((match) => match.tag),
        [query, tags]
    );
    const normalizedQuery = normalizeTagSlug(query);
    const hasExactTag = tags.some((tag) => tag.slug === normalizedQuery);
    const cleanQuery = query.trim().replace(/\s+/g, "");

    useEffect(() => {
        if (!isOpen) return;
        const closeOnOutsideClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
                setIsOpen(false);
                setMenuPosition(null);
                setQuery("");
                setPreviewTag(null);
                onPreviewTag(null);
                onFocusChange(null);
            }
        };
        document.addEventListener("mousedown", closeOnOutsideClick);
        return () => document.removeEventListener("mousedown", closeOnOutsideClick);
    }, [isOpen, onFocusChange, onPreviewTag]);

    useLayoutEffect(() => {
        if (!isOpen) return;

        const updateMenuPosition = () => {
            const triggerRect = rootRef.current?.getBoundingClientRect();
            if (!triggerRect) return;

            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const maxHeight = Math.min(
                TAG_MENU_MAX_HEIGHT_PX,
                Math.max(0, viewportHeight - TAG_MENU_VIEWPORT_MARGIN_PX * 2)
            );
            const measuredHeight = menuRef.current?.scrollHeight || TAG_MENU_MIN_HEIGHT_PX;
            const visibleHeight = Math.min(Math.max(measuredHeight, TAG_MENU_MIN_HEIGHT_PX), maxHeight);
            const preferredLeft = triggerRect.left - TAG_MENU_WIDTH_PX - TAG_MENU_GAP_PX;
            const rightSideLeft = triggerRect.right + TAG_MENU_GAP_PX;
            const canFitLeft = preferredLeft >= TAG_MENU_VIEWPORT_MARGIN_PX;
            const canFitRight = rightSideLeft + TAG_MENU_WIDTH_PX <= viewportWidth - TAG_MENU_VIEWPORT_MARGIN_PX;
            const placement = canFitLeft || !canFitRight ? "viewport-left" : "viewport-right";
            const unclampedLeft = placement === "viewport-left" ? preferredLeft : rightSideLeft;
            const left = Math.min(
                Math.max(unclampedLeft, TAG_MENU_VIEWPORT_MARGIN_PX),
                Math.max(TAG_MENU_VIEWPORT_MARGIN_PX, viewportWidth - TAG_MENU_WIDTH_PX - TAG_MENU_VIEWPORT_MARGIN_PX)
            );
            const top = Math.min(
                Math.max(triggerRect.top, TAG_MENU_VIEWPORT_MARGIN_PX),
                Math.max(TAG_MENU_VIEWPORT_MARGIN_PX, viewportHeight - visibleHeight - TAG_MENU_VIEWPORT_MARGIN_PX)
            );

            setMenuPosition({ left, top, maxHeight, placement });
        };

        updateMenuPosition();
        window.addEventListener("resize", updateMenuPosition);
        window.addEventListener("scroll", updateMenuPosition, true);
        return () => {
            window.removeEventListener("resize", updateMenuPosition);
            window.removeEventListener("scroll", updateMenuPosition, true);
        };
    }, [cleanQuery, isOpen, suggestions.length]);

    if (!isEditing) return null;

    const openMenu = () => {
        activeTags.forEach((tag) => onToggleTag(tag.id));
        setMenuPosition(null);
        setIsOpen(true);
        onFocusChange(focusPath);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const closeMenu = () => {
        setIsOpen(false);
        setMenuPosition(null);
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
            className="resume-edit-control resume-experience-tag-control absolute top-0 z-[95] flex min-h-5 justify-start"
            data-bullet-tags={bulletId}
            style={{
                "--resume-tag-connector-color": displayedTags.length > 0
                    ? getTagColorStyle(displayedTags[0].colorToken).color
                    : "#64748b"
            } as React.CSSProperties}
            onMouseEnter={() => onSectionHoverChange(true)}
            onMouseLeave={() => onSectionHoverChange(false)}
        >
            <button
                type="button"
                className="resume-tag-trigger resume-bullet-tag-menu group/tag-trigger inline-flex w-full items-start justify-start text-left font-normal leading-tight"
                onMouseDown={(event) => event.preventDefault()}
                onClick={openMenu}
                aria-label="Edit bullet tags"
                title={displayedTags.length ? displayedTags.map((tag) => tag.name).join(", ") : "Set Tag"}
            >
                {displayedTags.length > 0 && (
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                        {displayedTags.map((tag) => {
                            const color = getTagColorStyle(tag.colorToken).color;
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

            {isOpen && createPortal(
                <div
                    ref={menuRef}
                    className="resume-tag-menu-panel fixed z-[300] flex w-52 flex-col gap-0.5 overflow-hidden text-left"
                    data-tag-menu-placement={menuPosition?.placement || "viewport-left"}
                    role="menu"
                    onMouseEnter={() => onSectionHoverChange(true)}
                    onMouseLeave={() => onSectionHoverChange(false)}
                    style={{
                        left: menuPosition?.left ?? TAG_MENU_VIEWPORT_MARGIN_PX,
                        top: menuPosition?.top ?? TAG_MENU_VIEWPORT_MARGIN_PX,
                        maxHeight: menuPosition?.maxHeight ?? `calc(100vh - ${TAG_MENU_VIEWPORT_MARGIN_PX * 2}px)`,
                        visibility: menuPosition ? "visible" : "hidden"
                    }}
                >
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value.replace(/\s+/g, ""))}
                        onFocus={() => onFocusChange(focusPath)}
                        onKeyDown={(event) => {
                            if (event.key === "Escape") {
                                setIsOpen(false);
                                setMenuPosition(null);
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
                    <div className="resume-tag-menu-options">
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
                            const colors = getTagColorStyle(tag.colorToken);
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
                </div>,
                document.body
            )}
        </div>
    );
};
