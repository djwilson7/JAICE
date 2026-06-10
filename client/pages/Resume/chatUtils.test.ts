import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    CHAT_UNAVAILABLE_MESSAGE,
    REWRITE_REVIEWABLE_MESSAGE,
    stripMarkdownFormatting,
    buildAssistantCopyText,
    writePlainTextToClipboard,
} from './chatUtils';
import type { ResumeChatMessage } from './types';

// ─── stripMarkdownFormatting ────────────────────────────────────────────────

describe('stripMarkdownFormatting', () => {
    it('returns empty string unchanged', () => {
        expect(stripMarkdownFormatting('')).toBe('');
    });

    it('strips fenced code blocks', () => {
        const input = '```js\nconsole.log("hi")\n```';
        expect(stripMarkdownFormatting(input)).toBe('console.log("hi")');
    });

    it('strips inline code', () => {
        expect(stripMarkdownFormatting('Use `foo` here')).toBe('Use foo here');
    });

    it('strips image markdown', () => {
        expect(stripMarkdownFormatting('![alt text](http://img.png)')).toBe('alt text');
    });

    it('strips inline links', () => {
        expect(stripMarkdownFormatting('[link text](http://example.com)')).toBe('link text');
    });

    it('strips reference-style links', () => {
        expect(stripMarkdownFormatting('[link][ref]')).toBe('link');
    });

    it('strips reference link definitions', () => {
        const input = 'Hello\n[ref]: http://example.com\nWorld';
        const result = stripMarkdownFormatting(input);
        expect(result).not.toContain('[ref]');
    });

    it('strips headings (# through ######)', () => {
        expect(stripMarkdownFormatting('# H1\n## H2\n### H3')).toBe('H1\nH2\nH3');
    });

    it('strips blockquotes', () => {
        expect(stripMarkdownFormatting('> quoted text')).toBe('quoted text');
    });

    it('strips markdown table separators', () => {
        const table = '| col1 | col2 |\n|------|------|\n| a    | b    |';
        const result = stripMarkdownFormatting(table);
        expect(result).not.toContain('---');
    });

    it('converts table rows to spaced text', () => {
        const input = '| foo | bar |';
        const result = stripMarkdownFormatting(input);
        expect(result).toContain('foo');
        expect(result).toContain('bar');
    });

    it('strips horizontal rules (--- and ***)', () => {
        expect(stripMarkdownFormatting('---')).toBe('');
        expect(stripMarkdownFormatting('***')).toBe('');
        expect(stripMarkdownFormatting('___')).toBe('');
    });

    it('strips task list checkboxes', () => {
        // Checkboxes are stripped when they appear at the start of a line (without a list marker before them)
        const result = stripMarkdownFormatting('[ ] unchecked\n[x] checked\n[X] also checked');
        expect(result).not.toContain('[ ]');
        expect(result).not.toContain('[x]');
        expect(result).not.toContain('[X]');
        expect(result).toContain('unchecked');
        expect(result).toContain('checked');
    });

    it('strips unordered list markers', () => {
        expect(stripMarkdownFormatting('- item one\n* item two\n+ item three')).toBe('item one\nitem two\nitem three');
    });

    it('strips ordered list markers', () => {
        expect(stripMarkdownFormatting('1. first\n2. second\n3) third')).toBe('first\nsecond\nthird');
    });

    it('strips bold (**text**)', () => {
        expect(stripMarkdownFormatting('**bold text**')).toBe('bold text');
    });

    it('strips bold (__text__)', () => {
        expect(stripMarkdownFormatting('__bold text__')).toBe('bold text');
    });

    it('strips italic (*text*)', () => {
        expect(stripMarkdownFormatting('*italic text*')).toBe('italic text');
    });

    it('strips italic (_text_)', () => {
        expect(stripMarkdownFormatting('_italic text_')).toBe('italic text');
    });

    it('strips strikethrough', () => {
        expect(stripMarkdownFormatting('~~strikethrough~~')).toBe('strikethrough');
    });

    it('strips HTML tags', () => {
        expect(stripMarkdownFormatting('<strong>text</strong>')).toBe('text');
        expect(stripMarkdownFormatting('<br/>')).toBe('');
    });

    it('strips trailing whitespace before newlines', () => {
        const input = 'line one   \nline two';
        expect(stripMarkdownFormatting(input)).toBe('line one\nline two');
    });

    it('collapses 3+ consecutive newlines to 2', () => {
        const input = 'a\n\n\n\nb';
        expect(stripMarkdownFormatting(input)).toBe('a\n\nb');
    });

    it('trims leading and trailing whitespace', () => {
        expect(stripMarkdownFormatting('  hello  ')).toBe('hello');
    });

    it('normalizes \\r\\n to \\n', () => {
        const input = 'line one\r\nline two';
        const result = stripMarkdownFormatting(input);
        expect(result).not.toContain('\r');
        expect(result).toContain('line one');
        expect(result).toContain('line two');
    });

    it('normalizes standalone \\r to \\n', () => {
        const input = 'line one\rline two';
        const result = stripMarkdownFormatting(input);
        expect(result).not.toContain('\r');
    });

    it('handles plain text without markdown', () => {
        const text = 'Just plain text here.';
        expect(stripMarkdownFormatting(text)).toBe(text);
    });
});

// ─── buildAssistantCopyText ─────────────────────────────────────────────────

describe('buildAssistantCopyText', () => {
    it('returns stripped message text when no analysis or tailorSuggestions', () => {
        const msg: ResumeChatMessage = { sender: 'assistant', text: '**Hello** world' };
        expect(buildAssistantCopyText(msg)).toBe('Hello world');
    });

    it('returns empty string when text is empty and no extras', () => {
        const msg: ResumeChatMessage = { sender: 'assistant', text: '' };
        expect(buildAssistantCopyText(msg)).toBe('');
    });

    it('includes analysis block with all fields', () => {
        const msg: ResumeChatMessage = {
            sender: 'assistant',
            text: 'Analysis done.',
            analysis: {
                match_score: 85,
                requirements: ['req1', 'req2'],
                overlap: ['ov1'],
                gaps: ['gap1'],
                missing_keywords: ['kw1', 'kw2'],
                suggestions: ['suggestion1'],
            },
        };
        const result = buildAssistantCopyText(msg);
        expect(result).toContain('Match score: 85/100');
        expect(result).toContain('Requirements');
        expect(result).toContain('req1');
        expect(result).toContain('req2');
        expect(result).toContain('Overlap');
        expect(result).toContain('ov1');
        expect(result).toContain('Gaps');
        expect(result).toContain('gap1');
        expect(result).toContain('Missing keywords');
        expect(result).toContain('kw1');
        expect(result).toContain('kw2');
        expect(result).toContain('Suggestions');
        expect(result).toContain('suggestion1');
    });

    it('includes tailorSuggestions with summary and experience bullets', () => {
        const msg: ResumeChatMessage = {
            sender: 'assistant',
            text: 'Tailor done.',
            tailorSuggestions: {
                summary: [
                    { current_text: 'old', suggested_text: '**New** summary', reason: 'Better' },
                ],
                experience_bullets: [
                    {
                        experience_id: 'e1',
                        role_title: 'Engineer',
                        bullet_index: 0,
                        current_text: 'old bullet',
                        suggested_text: '**New** bullet',
                        reason: 'Clearer',
                    },
                ],
            },
        };
        const result = buildAssistantCopyText(msg);
        expect(result).toContain('Suggested resume wording');
        expect(result).toContain('Summary');
        expect(result).toContain('New summary');
        expect(result).toContain('Reason: Better');
        expect(result).toContain('Engineer bullet 1');
        expect(result).toContain('New bullet');
        expect(result).toContain('Reason: Clearer');
    });

    it('handles experience bullet with no role_title', () => {
        const msg: ResumeChatMessage = {
            sender: 'assistant',
            text: 'test',
            tailorSuggestions: {
                summary: [],
                experience_bullets: [
                    {
                        experience_id: null,
                        role_title: null,
                        bullet_index: 2,
                        current_text: 'old',
                        suggested_text: 'new',
                        reason: 'why',
                    },
                ],
            },
        };
        const result = buildAssistantCopyText(msg);
        expect(result).toContain('Experience bullet 3');
    });

    it('includes both analysis and tailorSuggestions', () => {
        const msg: ResumeChatMessage = {
            sender: 'assistant',
            text: 'Combined.',
            analysis: {
                match_score: 70,
                requirements: [],
                overlap: [],
                gaps: [],
                missing_keywords: [],
                suggestions: [],
            },
            tailorSuggestions: {
                summary: [],
                experience_bullets: [],
            },
        };
        const result = buildAssistantCopyText(msg);
        expect(result).toContain('Match analysis');
        expect(result).toContain('Suggested resume wording');
    });
});

// ─── writePlainTextToClipboard ───────────────────────────────────────────────

describe('writePlainTextToClipboard', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('uses navigator.clipboard.writeText when available', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            writable: true,
            configurable: true,
        });

        await writePlainTextToClipboard('hello');
        expect(writeText).toHaveBeenCalledWith('hello');
    });

    it('falls back to execCommand when clipboard API is unavailable', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            writable: true,
            configurable: true,
        });

        const mockExecCommand = vi.fn().mockReturnValue(true);
        document.execCommand = mockExecCommand;

        // Spy on body methods
        const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
        const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

        await writePlainTextToClipboard('fallback text');

        expect(mockExecCommand).toHaveBeenCalledWith('copy');
        appendSpy.mockRestore();
        removeSpy.mockRestore();
    });

    it('throws error in fallback when execCommand returns false', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            writable: true,
            configurable: true,
        });

        document.execCommand = vi.fn().mockReturnValue(false);
        const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
        const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

        await expect(writePlainTextToClipboard('fail text')).rejects.toThrow('Clipboard copy failed.');

        appendSpy.mockRestore();
        removeSpy.mockRestore();
    });

    it('always removes textarea even when execCommand throws', async () => {
        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            writable: true,
            configurable: true,
        });

        document.execCommand = vi.fn().mockImplementation(() => {
            throw new Error('execCommand error');
        });

        const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
        const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

        await expect(writePlainTextToClipboard('throw text')).rejects.toThrow('execCommand error');
        expect(removeSpy).toHaveBeenCalled();

        appendSpy.mockRestore();
        removeSpy.mockRestore();
    });
});

// ─── Exported constants ──────────────────────────────────────────────────────

describe('exported constants', () => {
    it('CHAT_UNAVAILABLE_MESSAGE is a non-empty string', () => {
        expect(typeof CHAT_UNAVAILABLE_MESSAGE).toBe('string');
        expect(CHAT_UNAVAILABLE_MESSAGE.length).toBeGreaterThan(0);
    });

    it('REWRITE_REVIEWABLE_MESSAGE is a non-empty string', () => {
        expect(typeof REWRITE_REVIEWABLE_MESSAGE).toBe('string');
        expect(REWRITE_REVIEWABLE_MESSAGE.length).toBeGreaterThan(0);
    });
});
