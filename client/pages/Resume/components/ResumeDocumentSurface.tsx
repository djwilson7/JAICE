import React from "react";
import type { ResumeData, ResumeFormatting } from "../types";
import { ResumeDocument } from "../rendering/ResumeDocument";

type ResumeDocumentSurfaceProps = {
    resumeData: ResumeData;
    formatting: ResumeFormatting;
    mode: "edit" | "print";
    rootId?: string;
    className?: string;
    style?: React.CSSProperties;
    ariaHidden?: boolean;
};

export const ResumeDocumentSurface: React.FC<ResumeDocumentSurfaceProps> = ({
    resumeData,
    formatting,
    mode,
    rootId,
    className,
    style,
    ariaHidden = mode === "print"
}) => (
    <ResumeDocument
        rootId={rootId}
        resumeData={resumeData}
        formatting={formatting}
        surface={mode === "print" ? "diagnostic" : "screen"}
        className={className}
        style={style}
        ariaHidden={ariaHidden}
    />
);
