import type React from "react";
import type { ResumeSectionKey } from "../../types";
import type { ResumeDocumentEditorProps } from "../ResumeDocumentEditor";

export type ResumeEditorSectionProps = ResumeDocumentEditorProps & {
    renderSectionTitle: (section: ResumeSectionKey) => React.ReactNode;
    renderInnerGapPreview: (key: string) => React.ReactNode;
};
