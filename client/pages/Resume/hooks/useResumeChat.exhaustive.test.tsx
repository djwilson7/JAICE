import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useResumeChat, getChatErrorMessage } from './useResumeChat';
import { streamResumeChatResponse } from "../resumeApi";
import { writePlainTextToClipboard, buildAssistantCopyText } from "../chatUtils";
import React, { useLayoutEffect } from 'react';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/pages/settings/provider/settingsContext', () => ({ useSettings: () => ({ theme: 'light' }) }));
vi.mock('../resumeDiagnostics', () => ({ isResumeDebugEnabled: () => false, resumeLog: vi.fn(), measurePerformance: (n: any, f: any) => f(), resumeTrace: vi.fn() }));
vi.mock('../resumeApi', () => ({ streamResumeChatResponse: vi.fn() }));
vi.mock('../chatUtils', () => ({
    CHAT_UNAVAILABLE_MESSAGE: "Chat unavailable",
    buildAssistantCopyText: vi.fn((m: any) => m.text ? "mock text" : ""),
    writePlainTextToClipboard: vi.fn(),
}));
vi.mock('../resumeData', () => ({
    normalizeResumeDataForPayload: (d: any) => d,
}));

const defaultProps = {
    resumeData: { contact: {}, summary: '', experience: [], education: [], skills: [] } as any,
    currentResumeFormatting: { paperMetrics: {} } as any,
    setError: vi.fn(),
    openChatRail: vi.fn(),
};

describe('useResumeChat exhaustive', () => {
    let resizeObserverCallback: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        (streamResumeChatResponse as any).mockResolvedValue({ receivedText: true });
        
        vi.stubGlobal('ResizeObserver', class {
            constructor(cb: any) { resizeObserverCallback = cb; }
            observe = vi.fn();
            disconnect = vi.fn();
            unobserve = vi.fn();
        });
        
        vi.stubGlobal('requestAnimationFrame', vi.fn((cb) => cb()));
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('covers getChatErrorMessage', () => {
        expect(getChatErrorMessage({ status: 503 } as any)).toBe("Chat unavailable");
        expect(getChatErrorMessage({ status: 401 } as any)).toMatch(/attention/);
        expect(getChatErrorMessage({ status: 500, detail: "Err" } as any)).toBe("Err");
    });

    it('covers all paths with real mount', async () => {
        const abortSpy = vi.fn();
        vi.stubGlobal('AbortController', class {
            abort = abortSpy;
            signal = {} as any;
        });

        const container = document.createElement('div');
        Object.defineProperty(container, 'scrollHeight', { value: 1000, configurable: true });
        Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });
        container.scrollTo = vi.fn();

        const textarea = document.createElement('textarea');
        Object.defineProperty(textarea, 'scrollHeight', { value: 100, configurable: true });

        let result: any;
        const TestComponent = () => {
            result = useResumeChat(defaultProps);
            useLayoutEffect(() => {
                (result.chatContainerRef as any).current = container;
                (result.chatInputRef as any).current = textarea;
            }, []);
            return null;
        };

        render(<TestComponent />);

        // 1. Initial state
        expect(result.chatMessages).toHaveLength(1);

        // 2. Send message with stream events
        let resolveStream: any;
        (streamResumeChatResponse as any).mockImplementation(async (p, s, applyEvent) => {
            act(() => {
                applyEvent({ event: 'intent', intent: 'analyze' });
                applyEvent({ event: 'delta', text: ' Hello' });
                applyEvent({ event: 'structured', intent: 'analyze', analysis: 'done' });
                applyEvent({ event: 'error', message: 'fail' });
            });
            return new Promise(res => resolveStream = res);
        });

        act(() => { result.setChatInput('Go'); });
        act(() => { result.handleSendChatMessage(); }); 
        
        // 3. Stop while running
        act(() => { result.handleStopChatMessage(); });
        expect(abortSpy).toHaveBeenCalled();
        
        await act(async () => resolveStream({ receivedText: true }));

        // 4. Copy assistant message and branch 266
        const clearSpy = vi.spyOn(window, 'clearTimeout').mockImplementation(() => {});
        await act(async () => { await result.handleCopyAssistantMessage({ sender: 'assistant', text: 'hi' }, 1); });
        await act(async () => { await result.handleCopyAssistantMessage({ sender: 'assistant', text: 'hi again' }, 2); });
        act(() => { vi.advanceTimersByTime(2000); });
        expect(result.copiedChatMessageIndex).toBeNull();
        clearSpy.mockRestore();

        // 5. Scroll shadows
        act(() => {
            Object.defineProperty(container, 'scrollTop', { value: 300, configurable: true });
            const event = new Event('scroll');
            container.dispatchEvent(event);
        });
        expect(result.showBackToBottom).toBe(true);

        act(() => { result.scrollChatToBottom(); });
        expect(container.scrollTo).toHaveBeenCalled();

        // 6. ResizeObserver
        act(() => { if (resizeObserverCallback) resizeObserverCallback(); });

        // 7. Textarea height
        act(() => { result.setChatInput('grow'); });
        expect(textarea.style.height).toBe('100px');

        // 8. Falsy receivedText
        (streamResumeChatResponse as any).mockResolvedValueOnce({ receivedText: false });
        act(() => { result.setChatInput('Again'); });
        await act(async () => { await result.handleSendChatMessage(); });

        // 9. API error
        (streamResumeChatResponse as any).mockRejectedValueOnce({ status: 500 });
        act(() => { result.setChatInput('ErrorMe'); });
        await act(async () => { await result.handleSendChatMessage(); });
    });
});
