import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeChatRail } from './ResumeChatRail';

vi.mock('@/global-components/ChatMarkdown', () => ({
    ChatMarkdown: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>
}));

vi.mock('./ResumeRailDivider', () => ({
    ResumeRailDivider: () => <div data-testid="divider" />
}));

describe('ResumeChatRail', () => {
    const defaultProps = {
        isLightMode: true,
        isRightRailCollapsed: false,
        rightRailShellStyle: {},
        railHeaderRowClass: '',
        railTitleClass: '',
        railTitleStyle: {},
        headerActionButtonClass: '',
        headerActionIconClass: '',
        chatContainerRef: { current: null },
        chatInputRef: { current: null },
        chatMessages: [],
        copiedChatMessageIndex: null,
        handleCopyAssistantMessage: vi.fn(),
        isChatResponding: false,
        isAssistantGenerating: false,
        showBackToBottom: true,
        chatScrollShadow: { top: true, bottom: true },
        scrollChatToBottom: vi.fn(),
        isChatInputCollapsed: false,
        setIsChatInputCollapsed: vi.fn(),
        chatInput: '',
        setChatInput: vi.fn(),
        handleSendChatMessage: vi.fn(),
        handleStopChatMessage: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders and handles collapsed state', () => {
        const { container } = render(<ResumeChatRail {...defaultProps} isRightRailCollapsed={true} />);
        expect(container).toBeTruthy();
    });

    it('renders user and assistant messages with analysis and suggestions', () => {
        const chatMessages = [
            { sender: 'user', text: 'Hello' },
            { sender: 'assistant', text: 'Hi', analysis: {
                match_score: 80,
                requirements: ['Req 1'],
                overlap: ['Overlap 1'],
                gaps: ['Gap 1'],
                missing_keywords: ['Key 1'],
                suggestions: ['Sugg 1']
            }, tailorSuggestions: {
                summary: [{ suggested_text: 'Summ 1', reason: 'Res 1' }],
                experience_bullets: [{ experience_id: '1', role_title: 'Role', bullet_index: 0, suggested_text: 'Bull 1', reason: 'Res 2' }]
            } },
            { sender: 'assistant', text: '' } // should be skipped
        ];

        render(<ResumeChatRail {...defaultProps} chatMessages={chatMessages as any} copiedChatMessageIndex={1} isLightMode={false} />);
        
        expect(screen.getByText('Hello')).toBeTruthy();
        expect(screen.getByText('Req 1')).toBeTruthy();
        expect(screen.getByText('Summ 1')).toBeTruthy();
        expect(screen.getByText('Bull 1')).toBeTruthy();
    });

    it('handles copy button click', () => {
        const chatMessages = [
            { sender: 'assistant', text: 'Copy me' }
        ];

        render(<ResumeChatRail {...defaultProps} chatMessages={chatMessages as any} />);
        const btn = screen.getByTitle('Copy plain text');
        fireEvent.click(btn);
        expect(defaultProps.handleCopyAssistantMessage).toHaveBeenCalledWith(chatMessages[0], 0);
    });

    it('handles scroll chat to bottom', () => {
        render(<ResumeChatRail {...defaultProps} />);
        const btn = screen.getByTitle('Back to bottom');
        fireEvent.click(btn);
        expect(defaultProps.scrollChatToBottom).toHaveBeenCalled();
    });

    it('handles chat input focus, change, and keydown', () => {
        render(<ResumeChatRail {...defaultProps} chatInput="Test" isChatInputCollapsed={true} />);
        const input = screen.getByPlaceholderText('Type a message or paste a job posting...');
        
        fireEvent.focus(input);
        expect(defaultProps.setIsChatInputCollapsed).toHaveBeenCalledWith(false);

        fireEvent.change(input, { target: { value: 'Test 2' } });
        expect(defaultProps.setChatInput).toHaveBeenCalled();

        fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
        expect(defaultProps.handleSendChatMessage).toHaveBeenCalled();

        fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
        // should not trigger send
    });

    it('handles send chat button', () => {
        render(<ResumeChatRail {...defaultProps} chatInput="Test" />);
        const btn = screen.getByTitle('Send message');
        fireEvent.click(btn);
        expect(defaultProps.handleSendChatMessage).toHaveBeenCalled();
    });

    it('handles stop chat button when generating', () => {
        render(<ResumeChatRail {...defaultProps} isChatResponding={true} />);
        const btn = screen.getByTitle('Stop generating');
        fireEvent.click(btn);
        expect(defaultProps.handleStopChatMessage).toHaveBeenCalled();
    });
});
