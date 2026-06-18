import React from "react";
import type { PaperMetrics, ResumeFormatting } from "../types";
import { saveResumeRenderDiagnostics } from "../resumeApi";
import {
    RESUME_RENDER_DIAGNOSTICS_VERSION,
    buildResumeRenderDiagnostics,
    isResumeDebugEnabled
} from "../resumeDiagnostics";

type ResumeRenderDiagnosticsBridgeProps = {
    formatting: ResumeFormatting;
    paperMetrics: PaperMetrics;
    resumeDocumentContentRef: React.RefObject<HTMLDivElement | null>;
    isPdfPreviewOpen: boolean;
    loadingList: boolean;
};

export const ResumeRenderDiagnosticsBridge: React.FC<ResumeRenderDiagnosticsBridgeProps> = ({
    formatting,
    paperMetrics,
    resumeDocumentContentRef,
    isPdfPreviewOpen,
    loadingList
}) => {
    const lastPostedFingerprintRef = React.useRef<string | null>(null);
    const fingerprint = JSON.stringify({
        diagnosticsVersion: RESUME_RENDER_DIAGNOSTICS_VERSION,
        formatting,
        paperHeight: paperMetrics.height
    });

    React.useEffect(() => {
        if (!isResumeDebugEnabled() || isPdfPreviewOpen || loadingList) return;
        if (lastPostedFingerprintRef.current === fingerprint) return;

        let attempts = 0;
        let timeoutId = 0;
        let cancelled = false;

        const captureAndSave = async () => {
            if (cancelled || lastPostedFingerprintRef.current === fingerprint) return;
            const editorElement = resumeDocumentContentRef.current;
            const canvasElement = document.getElementById("print-canvas");
            const surfaceElement = document.getElementById("resume-document-surface-print-comparison");
            if (!editorElement || !canvasElement || !surfaceElement) {
                attempts += 1;
                if (attempts < 8) timeoutId = window.setTimeout(captureAndSave, 200);
                return;
            }

            await document.fonts?.ready;
            await new Promise((resolve) => window.requestAnimationFrame(resolve));
            if (cancelled) return;

            const diagnostics = buildResumeRenderDiagnostics({
                phase: "edit-canvas",
                formatting,
                targets: [
                    {
                        label: "editor renderer",
                        element: editorElement,
                        intendedPageHeight: paperMetrics.height
                    },
                    {
                        label: "document surface renderer",
                        element: surfaceElement,
                        intendedPageHeight: paperMetrics.height
                    },
                    {
                        label: "canvas frame",
                        element: canvasElement,
                        intendedPageHeight: paperMetrics.height
                    }
                ]
            });

            try {
                const result = await saveResumeRenderDiagnostics(diagnostics);
                lastPostedFingerprintRef.current = fingerprint;
                console.info("[resumeDebug] frontend render diagnostics saved", result);
            } catch (error) {
                console.warn("[resumeDebug] failed to save frontend render diagnostics", error);
            }
        };

        timeoutId = window.setTimeout(captureAndSave, 750);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [fingerprint, formatting, isPdfPreviewOpen, loadingList, paperMetrics.height, resumeDocumentContentRef]);

    return null;
};
