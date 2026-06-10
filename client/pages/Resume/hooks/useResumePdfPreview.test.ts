import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useResumePdfPreview } from './useResumePdfPreview';
import { exportResumePdf } from '../resumeApi';

vi.mock('../resumeApi', () => ({ exportResumePdf: vi.fn() }));
vi.mock('../resumeDiagnostics', () => ({ isResumeDebugEnabled: () => false }));
vi.mock('../resumeData', () => ({ normalizeResumeDataForPayload: (d: any) => d }));

const mockBlob = new Blob(['%PDF'], { type: 'application/pdf' });

const defaultProps = {
    resumeData: { fullName: 'Alice', experience: [], education: [], skills: [] } as any,
    resumeName: 'My Resume',
    currentResumeFormatting: {} as any,
    setError: vi.fn(),
    setSuccessMessage: vi.fn(),
    clearFormatPreviews: vi.fn(),
};

describe('useResumePdfPreview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Stub URL methods that jsdom doesn't implement
        (URL as any).createObjectURL = vi.fn(() => 'blob:mock-url');
        (URL as any).revokeObjectURL = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('initialises with isPdfPreviewOpen=false', () => {
        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        expect(result.current.isPdfPreviewOpen).toBe(false);
    });

    it('openPdfPreview sets isPdfPreviewOpen=true and resolves url', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: 'test.pdf', previewUrl: null
        });

        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });

        expect(result.current.isPdfPreviewOpen).toBe(true);
        expect(result.current.isGeneratingPdfPreview).toBe(false);
        expect(result.current.pdfPreviewUrl).toBe('blob:mock-url');
        expect(result.current.pdfPreviewFilename).toBe('test.pdf');
        expect(result.current.canDownloadPdfPreview).toBe(true);
    });

    it('uses previewUrl from response when provided', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: null, previewUrl: 'blob:server-url'
        });

        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });

        expect(result.current.pdfPreviewUrl).toBe('blob:server-url');
    });

    it('falls back to resumeName sanitisation for filename', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: null, previewUrl: null
        });

        const props = { ...defaultProps, resumeName: 'My Resume:Name' };
        const { result } = renderHook(() => useResumePdfPreview(props));
        await act(async () => { await result.current.openPdfPreview(); });

        expect(result.current.pdfPreviewFilename).toContain('My_ResumeName');
    });

    it('uses "resume.pdf" when resumeName is empty after sanitisation', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: null, previewUrl: null
        });

        const props = { ...defaultProps, resumeName: ':::' };
        const { result } = renderHook(() => useResumePdfPreview(props));
        await act(async () => { await result.current.openPdfPreview(); });

        expect(result.current.pdfPreviewFilename).toBe('resume.pdf');
    });

    it('openPdfPreview on error closes preview and calls setError', async () => {
        (exportResumePdf as any).mockRejectedValue(new Error('PDF generation failed'));

        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });

        expect(result.current.isPdfPreviewOpen).toBe(false);
        expect(defaultProps.setError).toHaveBeenCalledWith('PDF generation failed');
    });

    it('openPdfPreview on error with no message uses fallback', async () => {
        (exportResumePdf as any).mockRejectedValue({});

        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });

        expect(defaultProps.setError).toHaveBeenCalledWith('Failed to generate PDF preview.');
    });

    it('closePdfPreview resets state', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: 'test.pdf', previewUrl: null
        });
        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });
        act(() => { result.current.closePdfPreview(); });

        expect(result.current.isPdfPreviewOpen).toBe(false);
        expect(result.current.pdfPreviewUrl).toBeNull();
        expect(result.current.canDownloadPdfPreview).toBe(false);
    });

    it('togglePdfPreview opens when closed', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: 'test.pdf', previewUrl: null
        });
        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.togglePdfPreview(); });
        expect(result.current.isPdfPreviewOpen).toBe(true);
    });

    it('togglePdfPreview closes when already open', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: 'test.pdf', previewUrl: null
        });
        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });
        act(() => { result.current.togglePdfPreview(); });
        expect(result.current.isPdfPreviewOpen).toBe(false);
    });

    it('downloadPdfPreview is a no-op when no blob', () => {
        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        expect(() => act(() => { result.current.downloadPdfPreview(); })).not.toThrow();
        expect(defaultProps.setSuccessMessage).not.toHaveBeenCalled();
    });

    it('downloadPdfPreview triggers download when blob exists', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: 'test.pdf', previewUrl: null
        });

        const { result } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });

        const anchor = document.createElement('a');
        const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {});
        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor);

        act(() => { result.current.downloadPdfPreview(); });

        expect(clickSpy).toHaveBeenCalled();
        expect(defaultProps.setSuccessMessage).toHaveBeenCalledWith('PDF exported.');
        
        createElementSpy.mockRestore();
    });

    it('revokes url on unmount', async () => {
        (exportResumePdf as any).mockResolvedValue({
            blob: mockBlob, filename: 'test.pdf', previewUrl: null
        });
        const { result, unmount } = renderHook(() => useResumePdfPreview(defaultProps));
        await act(async () => { await result.current.openPdfPreview(); });
        
        const url = result.current.pdfPreviewUrl;
        unmount();
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    });
});
