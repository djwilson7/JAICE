import React from "react";
import type { ResumeData, ResumeFormatting } from "../types";
import { ResumeDocument } from "../rendering/ResumeDocument";

type ResumePrintDocumentProps = {
    resumeData: ResumeData;
    formatting: ResumeFormatting;
};

export const ResumePrintDocument: React.FC<ResumePrintDocumentProps> = ({ resumeData, formatting }) => (
    <ResumeDocument
        rootId="resume-print-document"
        resumeData={resumeData}
        formatting={formatting}
        surface="print"
        ariaHidden
    />
);
