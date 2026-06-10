import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    listSavedResumes,
    createSavedResume,
    updateSavedResume,
    deleteSavedResume,
    exportResumePdf,
    saveResumeRenderDiagnostics,
    streamResumeTailorSuggestion,
    streamResumeChatResponse,
} from './resumeApi';

// Mock dependencies
vi.mock('@/global-services/api', () => ({
    api: vi.fn(),
    apiBlob: vi.fn(),
}));

vi.mock('@/global-services/apiBaseUrl', () => ({
    API_BASE_URL: 'http://localhost',
}));

vi.mock('@/global-services/auth', () => ({
    getIdToken: vi.fn().mockResolvedValue('fake-token'),
}));

import { api, apiBlob } from '@/global-services/api';
import { getIdToken } from '@/global-services/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStream(chunks: string[]) {
    return new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder();
            for (const chunk of chunks) {
                controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
        },
    });
}

// ─── Basic CRUD ───────────────────────────────────────────────────────────────

describe('resumeApi – CRUD helpers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('listSavedResumes calls api with correct path', async () => {
        (api as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'success', resumes: [] });
        const res = await listSavedResumes();
        expect(api).toHaveBeenCalledWith('/api/resume/resumes');
        expect(res.status).toBe('success');
    });

    it('createSavedResume calls api with correct payload', async () => {
        (api as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'success', resume: {} });
        const payload = { name: 'Test', is_master: false, source_resume_id: null, resume_data: {} as any };
        await createSavedResume(payload);
        expect(api).toHaveBeenCalledWith('/api/resume/resumes', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    });

    it('updateSavedResume calls api with correct payload', async () => {
        (api as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'success', resume: {} });
        const payload = { name: 'Updated', is_master: true, resume_data: {} as any };
        await updateSavedResume('123', payload);
        expect(api).toHaveBeenCalledWith('/api/resume/resumes/123', {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
    });

    it('deleteSavedResume calls api correctly', async () => {
        (api as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'success' });
        await deleteSavedResume('123');
        expect(api).toHaveBeenCalledWith('/api/resume/resumes/123', { method: 'DELETE' });
    });

    it('exportResumePdf without debugPdf does NOT include debug_pdf param', async () => {
        (apiBlob as ReturnType<typeof vi.fn>).mockResolvedValue(new Blob());
        const resumeData = {} as any;
        await exportResumePdf(resumeData, 'My Resume');
        const params = new URLSearchParams({ document_title: 'My Resume' });
        expect(apiBlob).toHaveBeenCalledWith(`/api/resume/export-pdf?${params.toString()}`, {
            method: 'POST',
            body: JSON.stringify(resumeData),
        });
    });

    it('exportResumePdf with debugPdf=true includes debug_pdf param', async () => {
        (apiBlob as ReturnType<typeof vi.fn>).mockResolvedValue(new Blob());
        const resumeData = {} as any;
        await exportResumePdf(resumeData, 'My Resume', true);
        const params = new URLSearchParams({ document_title: 'My Resume', debug_pdf: '1' });
        expect(apiBlob).toHaveBeenCalledWith(`/api/resume/export-pdf?${params.toString()}`, {
            method: 'POST',
            body: JSON.stringify(resumeData),
        });
    });

    it('saveResumeRenderDiagnostics calls api correctly', async () => {
        (api as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 'success' });
        await saveResumeRenderDiagnostics({ test: 'payload' });
        expect(api).toHaveBeenCalledWith('/api/resume/debug/render-diagnostics?debug_pdf=1', {
            method: 'POST',
            body: JSON.stringify({ test: 'payload' }),
        });
    });
});

// ─── streamResumeTailorSuggestion ────────────────────────────────────────────

describe('streamResumeTailorSuggestion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('resolves with assistantMessage and tailorSuggestions on success', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'structured', assistant_message: '**Result**', tailor_suggestions: { summary: [], experience_bullets: [] } }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const onEvent = vi.fn();
        const result = await streamResumeTailorSuggestion({} as any, onEvent);
        expect(result.assistantMessage).toBe('Result'); // markdown stripped
        expect(result.tailorSuggestions).toEqual({ summary: [], experience_bullets: [] });
        expect(onEvent).toHaveBeenCalled();
    });

    it('uses Authorization header when token is present', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'structured', assistant_message: 'ok', tailor_suggestions: null }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        await streamResumeTailorSuggestion({} as any, vi.fn());
        const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(options.headers['Authorization']).toBe('Bearer fake-token');
    });

    it('sends no Authorization header when token is null', async () => {
        (getIdToken as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
        const stream = makeStream([
            JSON.stringify({ event: 'structured', assistant_message: 'ok', tailor_suggestions: null }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        await streamResumeTailorSuggestion({} as any, vi.fn());
        const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(options.headers['Authorization']).toBeUndefined();
    });

    it('throws ApiError when response is not ok with JSON detail', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            status: 422,
            statusText: 'Unprocessable',
            json: vi.fn().mockResolvedValue({ detail: 'Validation error' }),
        });

        await expect(streamResumeTailorSuggestion({} as any, vi.fn())).rejects.toThrow('Validation error');
    });

    it('throws ApiError when response is not ok and JSON parse fails', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: vi.fn().mockRejectedValue(new Error('no json')),
        });

        await expect(streamResumeTailorSuggestion({} as any, vi.fn())).rejects.toThrow('500 Internal Server Error');
    });

    it('throws when response body is null', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: null });
        await expect(streamResumeTailorSuggestion({} as any, vi.fn())).rejects.toThrow('Streaming rewrite response was empty.');
    });

    it('throws when stream contains error event', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'error', message: 'Stream failed' }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        await expect(streamResumeTailorSuggestion({} as any, vi.fn())).rejects.toThrow('Stream failed');
    });

    it('throws when stream contains error event without message', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'error' }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        await expect(streamResumeTailorSuggestion({} as any, vi.fn())).rejects.toThrow('Failed to generate resume rewrite.');
    });

    it('throws REWRITE_REVIEWABLE_MESSAGE when no structured event received', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'done' }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        await expect(streamResumeTailorSuggestion({} as any, vi.fn())).rejects.toThrow();
    });

    it('handles tailor_suggestions: null in structured event', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'structured', assistant_message: 'hello', tailor_suggestions: null }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const result = await streamResumeTailorSuggestion({} as any, vi.fn());
        expect(result.tailorSuggestions).toBeNull();
    });

    it('handles multiple chunks buffered together', async () => {
        // Two lines split across chunks
        const line1 = JSON.stringify({ event: 'delta', text: 'chunk' });
        const line2 = JSON.stringify({ event: 'structured', assistant_message: 'done', tailor_suggestions: null });
        const stream = makeStream([line1 + '\n' + line2 + '\n']);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const result = await streamResumeTailorSuggestion({} as any, vi.fn());
        expect(result.assistantMessage).toBe('done');
    });
});

// ─── streamResumeChatResponse ─────────────────────────────────────────────────

describe('streamResumeChatResponse', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn();
    });

    it('resolves with receivedText=true on delta event with text', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'delta', text: 'Hello' }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const result = await streamResumeChatResponse({} as any, undefined, vi.fn(), vi.fn());
        expect(result.receivedText).toBe(true);
    });

    it('resolves with receivedText=false when only non-text events received', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'done' }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const result = await streamResumeChatResponse({} as any, undefined, vi.fn(), vi.fn());
        expect(result.receivedText).toBe(false);
    });

    it('calls onEvent for each parsed event', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'delta', text: 'Hello' }) + '\n',
            JSON.stringify({ event: 'done' }) + '\n',
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const onEvent = vi.fn();
        await streamResumeChatResponse({} as any, undefined, onEvent, vi.fn());
        expect(onEvent).toHaveBeenCalledTimes(2);
    });

    it('calls onTextFallback and sets receivedText=true for invalid JSON', async () => {
        const stream = makeStream(['invalid json line\n']);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const fallback = vi.fn();
        const result = await streamResumeChatResponse({} as any, undefined, vi.fn(), fallback);
        expect(fallback).toHaveBeenCalledWith('invalid json line');
        expect(result.receivedText).toBe(true);
    });

    it('throws when response is not ok', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
            ok: false,
            status: 403,
            statusText: 'Forbidden',
            json: vi.fn().mockResolvedValue({ detail: 'Auth failed' }),
        });

        await expect(streamResumeChatResponse({} as any, undefined, vi.fn(), vi.fn())).rejects.toThrow('Auth failed');
    });

    it('throws when response body is null', async () => {
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: null });
        await expect(streamResumeChatResponse({} as any, undefined, vi.fn(), vi.fn())).rejects.toThrow('Streaming response was empty.');
    });

    it('passes signal to fetch', async () => {
        const stream = makeStream([JSON.stringify({ event: 'done' }) + '\n']);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const controller = new AbortController();
        await streamResumeChatResponse({} as any, controller.signal, vi.fn(), vi.fn());
        const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(options.signal).toBe(controller.signal);
    });

    it('handles delta event without text (no receivedText)', async () => {
        const stream = makeStream([
            JSON.stringify({ event: 'delta' }) + '\n', // no text property
        ]);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        const result = await streamResumeChatResponse({} as any, undefined, vi.fn(), vi.fn());
        expect(result.receivedText).toBe(false);
    });

    it('sends Authorization header when token is present', async () => {
        const stream = makeStream([JSON.stringify({ event: 'done' }) + '\n']);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        await streamResumeChatResponse({} as any, undefined, vi.fn(), vi.fn());
        const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(options.headers['Authorization']).toBe('Bearer fake-token');
    });

    it('omits Authorization header when token is null', async () => {
        (getIdToken as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
        const stream = makeStream([JSON.stringify({ event: 'done' }) + '\n']);
        (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, body: stream });

        await streamResumeChatResponse({} as any, undefined, vi.fn(), vi.fn());
        const [, options] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
        expect(options.headers['Authorization']).toBeUndefined();
    });
});
