import React from "react";
import type { DocumentSectionId } from "../types";

export type DocumentSectionProps = {
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

export const DocumentSection: React.FC<DocumentSectionProps> = ({
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

export const ShelfMinusIcon = () => (
    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
    </svg>
);

export const ShelfPlusIcon = () => (
    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
    </svg>
);
