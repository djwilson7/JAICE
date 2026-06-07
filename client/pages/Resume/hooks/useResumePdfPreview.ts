import { useEffect, useState } from "react";
import type { ResumeData, ResumeFormatting } from "../types";
import { normalizeResumeDataForPayload } from "../resumeData";
import { exportResumePdf } from "../resumeApi";
import { isResumeDebugEnabled } from "../resumeDiagnostics";

type UseResumePdfPreviewParams = {
    resumeData: ResumeData;
    resumeName: string;
    currentResumeFormatting: ResumeFormatting;
    setError: (message: string | null) => void;
    setSuccessMessage: (message: string | null) => void;
    clearFormatPreviews: () => void;
};

export const useResumePdfPreview = ({
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

    const revokePdfPreviewUrl = (url: string | null) => {
        if (url) {
            URL.revokeObjectURL(url);
        }
    };

    const closePdfPreview = () => {
        setIsPdfPreviewOpen(false);
        setPdfPreviewBlob(null);
        setPdfPreviewFilename("resume.pdf");
        setPdfPreviewUrl((currentUrl) => {
            revokePdfPreviewUrl(currentUrl);
            return null;
        });
    };

    const openPdfPreview = async () => {
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
            console.error(err);
            closePdfPreview();
            setError((err as Error).message || "Failed to generate PDF preview.");
        } finally {
            setIsGeneratingPdfPreview(false);
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
