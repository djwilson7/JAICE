import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useResumeRewriteSuggestions } from './useResumeRewriteSuggestions';
import * as resumeApi from '../resumeApi';

vi.mock('../resumeApi');
vi.mock('../resumeDiagnostics', () => ({ isResumeDebugEnabled: () => false, resumeLog: vi.fn(), measurePerformance: (n: any, f: any) => f(), resumeTrace: vi.fn() }));

describe('useResumeRewriteSuggestions exhaustive', () => {
    const baseProps = {
        resumeData: { 
            summary: 'Old summary', 
            experience: [{ id: 'exp1', bullets: [{ id: 'b1', text: 'Old bullet' }] }] 
        },
        setResumeData: vi.fn(),
        currentResumeFormatting: { paperMetrics: {} },
        setError: vi.fn(),
        setSuccessMessage: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('covers all summary and experience paths', async () => {
        (resumeApi.streamResumeTailorSuggestion as any).mockImplementation(async (params, cb) => {
            if (params.target === 'summary') {
                cb({ event: 'delta', target: 'summary', text: 'Streamed summary' });
                return {
                    assistantMessage: 'Summary success',
                    tailorSuggestions: { summary: [{ suggested_text: 'Final summary', reason: 'Better' }] }
                };
            } else {
                cb({ event: 'delta', target: 'experience', bullet_index: 0, text: 'Streamed bullet' });
                return {
                    assistantMessage: 'Exp success',
                    tailorSuggestions: { experience_bullets: [{ bullet_index: 0, suggested_text: 'Final bullet', reason: 'Stronger' }] }
                };
            }
        });

        const { result } = renderHook(() => useResumeRewriteSuggestions(baseProps as any));

        // 1. Improve Summary success
        await act(async () => { await result.current.handleImproveSummary(); });
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(result.current.summaryRewriteSuggestion?.suggestedText).toBe('Final summary');

        // 2. Accept Summary
        act(() => { result.current.acceptSummaryRewriteSuggestion(); });
        expect(baseProps.setResumeData).toHaveBeenCalled();
        expect(result.current.isDraft).toBe(true);

        // 3. Improve Experience success
        await act(async () => { await result.current.handleImproveExperience(baseProps.resumeData.experience[0] as any); });
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(result.current.experienceRewriteSuggestions['exp1'].items[0].suggestedText).toBe('Final bullet');

        // 4. Accept Experience
        act(() => { result.current.acceptExperienceRewriteSuggestion('exp1', 'b1'); });
        expect(baseProps.setResumeData).toHaveBeenCalledTimes(2);

        // 5. Reject paths
        await act(async () => { await result.current.handleImproveSummary(); });
        await act(async () => { await vi.runAllTimersAsync(); });
        act(() => { result.current.rejectSummaryRewriteSuggestion(); });
        expect(result.current.summaryRewriteSuggestion).toBeNull();

        await act(async () => { await result.current.handleImproveExperience(baseProps.resumeData.experience[0] as any); });
        await act(async () => { await vi.runAllTimersAsync(); });
        act(() => { result.current.rejectExperienceRewriteSuggestion('exp1', 'b1'); });
        expect(result.current.experienceRewriteSuggestions['exp1']).toBeUndefined();

        // 6. Error path for Summary
        (resumeApi.streamResumeTailorSuggestion as any).mockRejectedValueOnce(new Error('Fail summary'));
        await act(async () => { await result.current.handleImproveSummary(); });
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(baseProps.setError).toHaveBeenCalled();

        // 7. Error path for Experience
        (resumeApi.streamResumeTailorSuggestion as any).mockRejectedValueOnce(new Error('Fail exp'));
        await act(async () => { await result.current.handleImproveExperience(baseProps.resumeData.experience[0] as any); });
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(baseProps.setError).toHaveBeenCalled();

        // 8. Empty suggestion returned
        (resumeApi.streamResumeTailorSuggestion as any).mockResolvedValueOnce({ tailorSuggestions: { summary: [] } });
        await act(async () => { await result.current.handleImproveSummary(); });
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(baseProps.setError).toHaveBeenCalled();

        // 9. Experience no longer exists during accept
        const propsWithNoExp = { ...baseProps, resumeData: { ...baseProps.resumeData, experience: [] }, setResumeData: vi.fn(), setError: vi.fn() };
        const { result: res2 } = renderHook(() => useResumeRewriteSuggestions(propsWithNoExp as any));
        await act(async () => { await res2.current.handleImproveExperience(baseProps.resumeData.experience[0] as any); });
        await act(async () => { await vi.runAllTimersAsync(); });
        act(() => { res2.current.acceptExperienceRewriteSuggestion('exp1', 'b1'); });
        expect(propsWithNoExp.setError).toHaveBeenCalledWith("That experience entry no longer exists.");
    });

    it('hits return branches', () => {
        const { result } = renderHook(() => useResumeRewriteSuggestions(baseProps as any));
        act(() => { result.current.acceptSummaryRewriteSuggestion(); });
        act(() => { result.current.rejectSummaryRewriteSuggestion(); });
        act(() => { result.current.acceptExperienceRewriteSuggestion('fake', 'fake'); });
        act(() => { result.current.rejectExperienceRewriteSuggestion('fake', 'fake'); });
    });

    it('hits raw model output branch', async () => {
        const { result } = renderHook(() => useResumeRewriteSuggestions(baseProps as any));
        (resumeApi.streamResumeTailorSuggestion as any).mockRejectedValueOnce({ status: 500, detail: '{"tailor_suggestions": []}' });
        await act(async () => { await result.current.handleImproveSummary(); });
        await act(async () => { await vi.runAllTimersAsync(); });
        expect(baseProps.setError).toHaveBeenCalled();
    });

    it('handleImproveSummary: already streaming branch', async () => {
        const { result } = renderHook(() => useResumeRewriteSuggestions(baseProps as any));
        let resolveStream: any;
        (resumeApi.streamResumeTailorSuggestion as any).mockImplementation(() => new Promise(res => resolveStream = res));
        
        act(() => { result.current.handleImproveSummary(); });
        await act(async () => { await Promise.resolve(); }); // allow enqueue
        
        act(() => { result.current.handleImproveSummary(); }); // second call - should return early
        expect(resumeApi.streamResumeTailorSuggestion).toHaveBeenCalledTimes(1);
        await act(async () => resolveStream({ tailorSuggestions: { summary: [] } }));
    });
});
