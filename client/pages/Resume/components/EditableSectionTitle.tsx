import React, { useEffect, useRef } from "react";
import type { ResumeSectionKey } from "../types";

type EditableSectionTitleProps = {
    section: ResumeSectionKey;
    title: string;
    fallbackTitle: string;
    isEditing: boolean;
    className: string;
    style?: React.CSSProperties;
    onChange: (value: string) => void;
    onFocusChange: (fieldPath: string | null) => void;
};

export const EditableSectionTitle: React.FC<EditableSectionTitleProps> = ({
    section,
    title,
    fallbackTitle,
    isEditing,
    className,
    style,
    onChange,
    onFocusChange
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const fieldPath = `sectionTitles.${section}`;

    useEffect(() => {
        if (isEditing && document.activeElement === inputRef.current) {
            onFocusChange(fieldPath);
        }
    }, [fieldPath, isEditing, onFocusChange]);

    if (!isEditing) {
        return (
            <h2 className={className} style={style}>
                {title.trim() || fallbackTitle}
            </h2>
        );
    }

    return (
        <input
            ref={inputRef}
            aria-label={`${fallbackTitle} section title`}
            className={`${className} bg-white outline-none transition-colors hover:bg-slate-50 focus:border-sky-500 focus:bg-sky-50/80 focus:ring-2 focus:ring-sky-500/15`}
            style={style}
            value={title}
            placeholder={fallbackTitle}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => onFocusChange(fieldPath)}
            onBlur={() => onFocusChange(null)}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    event.currentTarget.blur();
                }
            }}
        />
    );
};
