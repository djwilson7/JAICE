import { useEffect, useRef, useState } from "react";
import type { ResumeData, ResumeFormatting } from "../types";
import { normalizeResumeDataForPayload } from "../resumeData";
import { exportResumePdf } from "../resumeApi";
import { isResumeDebugEnabled } from "../resumeDiagnostics";

type UseResumePdfPreviewParams = {
    activeResumeId: string | null;
    resumeData: ResumeData;
    resumeName: string;
    currentResumeFormatting: ResumeFormatting;
    setError: (message: string | null) => void;
    setSuccessMessage: (message: string | null) => void;
    clearFormatPreviews: () => void;
};

export const useResumePdfPreview = ({
    activeResumeId,
    resumeData,
    resumeName,
    currentResumeFormatting,
    setError,
    setSuccessMessage,
    clearFormatPreviews
}: UseResumePdfPreviewParams) => {
    const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);
    const [isGeneratingPdfPreview, setIsGeneratingPdfPreview] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
    const [pdfPreviewFilename, setPdfPreviewFilename] = useState("resume.pdf");
    const previewGenerationRef = useRef(0);

    const revokePdfPreviewUrl = (url: string | null) => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    };

    const closePdfPreview = () => {
        previewGenerationRef.current += 1;
        setIsPdfPreviewOpen(false);
        setPdfPreviewBlob(null);
        setPdfPreviewFilename("resume.pdf");
        setPdfPreviewUrl((currentUrl) => {
            revokePdfPreviewUrl(currentUrl);
            return null;
        });
    };

    const openPdfPreview = async () => {
        const previewGeneration = ++previewGenerationRef.current;
        clearFormatPreviews();
        setError(null);
        setSuccessMessage(null);

        const exportData = normalizeResumeDataForPayload({
            ...resumeData,
            formatting: currentResumeFormatting
        });
        const filenameBase = (resumeName || "resume").trim().replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_") || "resume";
        const requestedFilename = `${filenameBase}.pdf`;

        setIsPdfPreviewOpen(true);
        setIsGeneratingPdfPreview(true);

        try {
            const { blob, filename, previewUrl } = await exportResumePdf(exportData, resumeName, isResumeDebugEnabled());
            if (previewGeneration !== previewGenerationRef.current) {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                return;
            }
            const resolvedFilename = filename || requestedFilename;
            const pdfFile = new File([blob], resolvedFilename, { type: "application/pdf" });
            const objectUrl = previewUrl || URL.createObjectURL(pdfFile);
            setPdfPreviewUrl((currentUrl) => {
                revokePdfPreviewUrl(currentUrl);
                return objectUrl;
            });
            setPdfPreviewBlob(pdfFile);
            setPdfPreviewFilename(resolvedFilename);
        } catch (err) {
            if (previewGeneration !== previewGenerationRef.current) return;
            console.error(err);
            closePdfPreview();
            setError((err as Error).message || "Failed to generate PDF preview.");
        } finally {
            if (previewGeneration === previewGenerationRef.current) setIsGeneratingPdfPreview(false);
        }
    };

    const togglePdfPreview = () => {
        if (isPdfPreviewOpen) {
            closePdfPreview();
            return;
        }
        openPdfPreview();
    };

    const downloadPdfPreview = () => {
        if (!pdfPreviewBlob) return;

        const url = URL.createObjectURL(pdfPreviewBlob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = pdfPreviewFilename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setSuccessMessage("PDF exported.");
    };

    useEffect(() => {
        closePdfPreview();
        // The active document owns its preview blob and measurement lifecycle.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeResumeId]);

    useEffect(() => {
        return () => {
            revokePdfPreviewUrl(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    return {
        isPdfPreviewOpen,
        isGeneratingPdfPreview,
        pdfPreviewUrl,
        pdfPreviewFilename,
        canDownloadPdfPreview: Boolean(pdfPreviewBlob),
        openPdfPreview,
        togglePdfPreview,
        closePdfPreview,
        downloadPdfPreview
    };
};
