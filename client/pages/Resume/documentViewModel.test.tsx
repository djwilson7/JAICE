import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the OverlayInput component so documentViewModel doesn't require DOM internals
vi.mock('./components/OverlayInput', () => ({
    OverlayInput: (props: Record<string, unknown>) => (
        React.createElement('div', { 'data-testid': 'overlay-input', 'data-path': props.path as string })
    ),
}));

vi.mock('./resumeTypography', () => ({
    RESUME_DOCUMENT_TYPOGRAPHY: {
        bodyFamily: 'Arial, sans-serif',
        sectionHeadingClass: 'section-heading',
        sectionHeadingFamily: 'Arial, sans-serif',
        headingLineHeight: 1.1,
        sectionHeadingMarginBottomPx: 4,
        headingWeight: 700,
        contactFamily: 'Arial, sans-serif',
        contactLineHeight: 1.2,
        bodyWeight: 400,
    },
}));

vi.mock('./resumeData', () => ({
    hasText: (v: unknown) => String(v ?? '').trim().length > 0,
}));

import { useResumeDocumentViewModel } from './documentViewModel';
import type { ResumeData, ChangeMetadata } from './types';

// ─── Test helpers ────────────────────────────────────────────────────────────

const makeMinimalResumeData = (overrides: Partial<ResumeData> = {}): ResumeData => ({
    fullName: 'Test User',
    experience: [],
    education: [],
    ...overrides,
});

const defaultParams = {
    resumeData: makeMinimalResumeData(),
    changeMetadata: [] as ChangeMetadata[],
    bodyFontSize: 12,
    headerFontSize: 16,
    pageMarginPt: 42,
    activeDocumentSection: null as string | null,
    hoveredSummary: false,
    focusedSummary: false,
    hoveredContactField: null as string | null,
    focusedContactField: null as string | null,
    hoveredField: null as string | null,
    setHoveredField: vi.fn(),
    focusedField: null as string | null,
    setFocusedField: vi.fn(),
    rewriteActionHover: null as null,
};

/** Render the hook by calling it inside a component */
function callHook(params = defaultParams) {
    let result!: ReturnType<typeof useResumeDocumentViewModel>;
    function Wrapper() {
        result = useResumeDocumentViewModel(params);
        return null;
    }
    render(React.createElement(Wrapper));
    return result;
}

// ─── isFieldChanged ─────────────────────────────────────────────────────────

describe('useResumeDocumentViewModel – isFieldChanged', () => {
    it('returns { changed: false } when no match', () => {
        const vm = callHook();
        expect(vm.isFieldChanged('some.path')).toEqual({ changed: false });
    });

    it('returns { changed: true, reason } when a match exists', () => {
        const vm = callHook({
            ...defaultParams,
            changeMetadata: [{ path: 'fullName', before: 'a', after: 'b', reason: 'AI edit' }],
        });
        expect(vm.isFieldChanged('fullName')).toEqual({ changed: true, reason: 'AI edit' });
    });
});

// ─── getDynamicInputStyle ────────────────────────────────────────────────────

describe('useResumeDocumentViewModel – getDynamicInputStyle', () => {
    it('returns a style object with width and fontSize', () => {
        const vm = callHook();
        const style = vm.getDynamicInputStyle('hello', 'Placeholder');
        expect(style).toHaveProperty('fontSize');
        expect(style).toHaveProperty('width');
    });

    it('uses placeholder when value is empty', () => {
        const vm = callHook();
        const style = vm.getDynamicInputStyle('', 'Placeholder text');
        expect(style).toHaveProperty('width');
    });

    it('handles undefined value', () => {
        const vm = callHook();
        const style = vm.getDynamicInputStyle(undefined, 'Fallback');
        expect(style).toHaveProperty('width');
    });

    it('uses 24px font path for large font', () => {
        const vm = callHook();
        // 24px font uses a different padding branch
        const style = vm.getDynamicInputStyle('Name', 'Name', '700 24px Arial, sans-serif');
        expect(style).toHaveProperty('width');
    });
});

// ─── getSuggestionReviewClass ────────────────────────────────────────────────

describe('useResumeDocumentViewModel – getSuggestionReviewClass', () => {
    it('returns accept class when action is accept', () => {
        const vm = callHook();
        expect(vm.getSuggestionReviewClass('accept')).toContain('accept');
    });

    it('returns reject class when action is reject', () => {
        const vm = callHook();
        expect(vm.getSuggestionReviewClass('reject')).toContain('reject');
    });

    it('returns empty string for undefined action', () => {
        const vm = callHook();
        expect(vm.getSuggestionReviewClass(undefined)).toBe('');
    });
});

// ─── summaryCurrentRewriteClass ─────────────────────────────────────────────

describe('useResumeDocumentViewModel – summaryCurrentRewriteClass', () => {
    it('returns accept-hover class when rewriteActionHover is accept on summary', () => {
        const vm = callHook({
            ...defaultParams,
            rewriteActionHover: { target: 'summary', action: 'accept' },
        });
        expect(vm.summaryCurrentRewriteClass).toContain('accept');
    });

    it('returns reject-hover class when rewriteActionHover is reject on summary', () => {
        const vm = callHook({
            ...defaultParams,
            rewriteActionHover: { target: 'summary', action: 'reject' },
        });
        expect(vm.summaryCurrentRewriteClass).toContain('reject');
    });

    it('returns empty string when rewriteActionHover targets experience', () => {
        const vm = callHook({
            ...defaultParams,
            rewriteActionHover: { target: 'experience', action: 'accept', id: 'e1' },
        });
        expect(vm.summaryCurrentRewriteClass).toBe('');
    });

    it('returns empty string when rewriteActionHover is null', () => {
        const vm = callHook();
        expect(vm.summaryCurrentRewriteClass).toBe('');
    });
});

// ─── headerContactRows ──────────────────────────────────────────────────────

describe('useResumeDocumentViewModel – headerContactRows', () => {
    it('includes contact fields that have text', () => {
        const vm = callHook({
            ...defaultParams,
            resumeData: makeMinimalResumeData({ email: 'test@test.com', phone: '555-1234' }),
        });
        // When showHeaderContactEditors is false but field has text, it should be included
        const allFields = vm.headerContactRows.flat();
        expect(allFields.some((f) => f.value === 'test@test.com')).toBe(true);
    });

    it('shows all standard fields when showHeaderContactEditors is true', () => {
        const vm = callHook({
            ...defaultParams,
            hoveredContactField: 'email',
            resumeData: makeMinimalResumeData({
                email: 'e@e.com',
                phone: '111',
                location: 'NYC',
                linkedin: 'linkedin',
                website: 'web',
                github: 'github',
            }),
        });
        const allFields = vm.headerContactRows.flat();
        expect(allFields.length).toBeGreaterThanOrEqual(6);
    });

    it('excludes hidden contact fields', () => {
        const vm = callHook({
            ...defaultParams,
            hoveredContactField: 'email',
            resumeData: makeMinimalResumeData({
                email: 'e@e.com',
                phone: '111',
                hiddenContactFields: ['phone'],
            }),
        });
        const allFields = vm.headerContactRows.flat();
        expect(allFields.some((f) => !f.isCustom && f.key === 'phone')).toBe(false);
    });

    it('chunks contact rows into groups of 3', () => {
        const vm = callHook({
            ...defaultParams,
            hoveredContactField: 'email',
            resumeData: makeMinimalResumeData({
                email: 'e@e.com',
                phone: '111',
                location: 'NYC',
                linkedin: 'li',
                website: 'ws',
                github: 'gh',
            }),
        });
        vm.headerContactRows.forEach((row) => {
            expect(row.length).toBeLessThanOrEqual(3);
        });
    });

    it('includes custom contact fields', () => {
        const vm = callHook({
            ...defaultParams,
            hoveredContactField: 'email',
            resumeData: makeMinimalResumeData({
                customContact: [
                    { label: 'Portfolio', value: 'port.io' },
                ],
            }),
        });
        const allFields = vm.headerContactRows.flat();
        expect(allFields.some((f) => f.isCustom)).toBe(true);
    });

    it('filters custom contacts without text when editors hidden', () => {
        const vm = callHook({
            ...defaultParams,
            resumeData: makeMinimalResumeData({
                customContact: [
                    { label: 'Empty', value: '' },
                ],
            }),
        });
        const allFields = vm.headerContactRows.flat();
        expect(allFields.some((f) => f.isCustom)).toBe(false);
    });
});

// ─── section active classes ──────────────────────────────────────────────────

describe('useResumeDocumentViewModel – section active states', () => {
    it('isExperienceSectionActive is true when activeDocumentSection is experience', () => {
        const vm = callHook({ ...defaultParams, activeDocumentSection: 'experience' });
        expect(vm.isExperienceSectionActive).toBe(true);
    });

    it('isExperienceSectionActive is false for other sections', () => {
        const vm = callHook({ ...defaultParams, activeDocumentSection: 'header' });
        expect(vm.isExperienceSectionActive).toBe(false);
    });

    it('isSummarySectionActive is true when activeDocumentSection is summary', () => {
        const vm = callHook({ ...defaultParams, activeDocumentSection: 'summary' });
        expect(vm.isSummarySectionActive).toBe(true);
    });
});

// ─── renderOverlayInput ──────────────────────────────────────────────────────

describe('useResumeDocumentViewModel – renderOverlayInput', () => {
    it('renders an OverlayInput element', () => {
        let vm!: ReturnType<typeof useResumeDocumentViewModel>;
        function Wrapper() {
            vm = useResumeDocumentViewModel(defaultParams);
            return React.createElement(
                'div',
                null,
                vm.renderOverlayInput({
                    path: 'test.path',
                    label: 'Test',
                    value: 'val',
                    placeholder: 'ph',
                    className: 'cls',
                    onChange: vi.fn(),
                }),
            );
        }
        render(React.createElement(Wrapper));
        expect(screen.getByTestId('overlay-input')).toBeDefined();
    });
});

// ─── renderRewriteActionButtons ─────────────────────────────────────────────

describe('useResumeDocumentViewModel – renderRewriteActionButtons', () => {
    it('renders accept and reject buttons', () => {
        let vm!: ReturnType<typeof useResumeDocumentViewModel>;
        function Wrapper() {
            vm = useResumeDocumentViewModel(defaultParams);
            return React.createElement(
                'div',
                null,
                vm.renderRewriteActionButtons({
                    onAccept: vi.fn(),
                    onReject: vi.fn(),
                    onAcceptHover: vi.fn(),
                    onRejectHover: vi.fn(),
                    onClearHover: vi.fn(),
                }),
            );
        }
        render(React.createElement(Wrapper));
        const buttons = document.querySelectorAll('button');
        expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
});

// ─── measureTextWidth (via getDynamicInputStyle) ────────────────────────────

describe('useResumeDocumentViewModel – measureTextWidth edge cases', () => {
    it('returns a style with minWidth 16px when empty string', () => {
        const vm = callHook();
        const style = vm.getDynamicInputStyle('', '', '500 12px Arial');
        // width should be at least minWidth (16)
        const widthNum = parseInt(String(style.width), 10);
        expect(widthNum).toBeGreaterThanOrEqual(16);
    });
});

// ─── Returned values ─────────────────────────────────────────────────────────

describe('useResumeDocumentViewModel – returned object shape', () => {
    it('returns all expected keys', () => {
        const vm = callHook();
        const expectedKeys = [
            'isFieldChanged',
            'renderOverlayInput',
            'inputStyleClass',
            'boldInputClass',
            'documentTextStyle',
            'sectionHeadingClass',
            'sectionHeadingStyle',
            'compactFitMetaInputClass',
            'compactFitDateInputClass',
            'contactInputClass',
            'resumeDividerClass',
            'getDynamicInputStyle',
            'contactFieldStyle',
            'headerMarginAddClass',
            'isExperienceSectionActive',
            'experienceMarginAddClass',
            'experienceMarginImproveClass',
            'experienceMarginClearClass',
            'experienceMarginDeleteClass',
            'isSummarySectionActive',
            'summaryMarginImproveClass',
            'summaryRewriteHoverAction',
            'summaryCurrentRewriteClass',
            'showHeaderContactEditors',
            'headerContactRows',
            'getSuggestionReviewClass',
            'renderRewriteActionButtons',
        ];
        for (const key of expectedKeys) {
            expect(vm).toHaveProperty(key);
        }
    });
});
