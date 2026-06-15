import React, { useRef, useState } from "react";

type InlineBulletComposerProps = {
    placeholder: string;
    className: string;
    style: React.CSSProperties;
    focusPath: string;
    onCommit: (value: string) => void;
    onFocusChange: (fieldPath: string | null) => void;
};

export const InlineBulletComposer: React.FC<InlineBulletComposerProps> = ({
    placeholder,
    className,
    style,
    focusPath,
    onCommit,
    onFocusChange
}) => {
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const commit = () => {
        const value = draft.trim();
        if (!value) return false;
        onCommit(value);
        setDraft("");
        return true;
    };

    return (
        <input
            ref={inputRef}
            className={className}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onFocus={() => onFocusChange(focusPath)}
            onBlur={() => {
                commit();
                onFocusChange(null);
            }}
            onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (commit()) {
                    requestAnimationFrame(() => inputRef.current?.focus());
                } else {
                    event.currentTarget.blur();
                }
            }}
            placeholder={placeholder}
            style={style}
        />
    );
};
