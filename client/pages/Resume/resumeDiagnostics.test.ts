import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    RESUME_RENDER_DIAGNOSTICS_VERSION,
    isResumeDebugEnabled,
    buildResumeRenderDiagnostics,
} from './resumeDiagnostics';

// ─── RESUME_RENDER_DIAGNOSTICS_VERSION ──────────────────────────────────────

describe('RESUME_RENDER_DIAGNOSTICS_VERSION', () => {
    it('is a non-empty string', () => {
        expect(typeof RESUME_RENDER_DIAGNOSTICS_VERSION).toBe('string');
        expect(RESUME_RENDER_DIAGNOSTICS_VERSION.length).toBeGreaterThan(0);
    });
});

// ─── isResumeDebugEnabled ────────────────────────────────────────────────────

describe('isResumeDebugEnabled', () => {
    const originalLocation = window.location;

    afterEach(() => {
        // Restore window.location
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
            configurable: true,
        });
    });

    it('returns true when resumeDebug=1 is in query string', () => {
        Object.defineProperty(window, 'location', {
            value: { search: '?resumeDebug=1' },
            writable: true,
            configurable: true,
        });
        expect(isResumeDebugEnabled()).toBe(true);
    });

    it('returns false when resumeDebug is absent', () => {
        Object.defineProperty(window, 'location', {
            value: { search: '' },
            writable: true,
            configurable: true,
        });
        expect(isResumeDebugEnabled()).toBe(false);
    });

    it('returns false when resumeDebug is not "1"', () => {
        Object.defineProperty(window, 'location', {
            value: { search: '?resumeDebug=0' },
            writable: true,
            configurable: true,
        });
        expect(isResumeDebugEnabled()).toBe(false);
    });
});

// ─── buildResumeRenderDiagnostics helpers ─────────────────────────────────────

const defaultFormatting = {
    pageSize: 'letter',
    titleFontSize: 24,
    headerFontSize: 16,
    bodyFontSize: 12,
    pageMarginPt: 42,
    paperLayoutFormat: 'standard',
};

/** Create a minimal mock Element with all required methods */
function makeMockElement(overrides: Partial<HTMLElement> = {}): Element {
    const computedStyle: Partial<CSSStyleDeclaration> = {
        paddingTop: '10px',
        paddingRight: '10px',
        paddingBottom: '10px',
        paddingLeft: '10px',
        borderTopWidth: '1px',
        borderRightWidth: '1px',
        borderBottomWidth: '1px',
        borderLeftWidth: '1px',
        width: '800px',
        height: '1000px',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'auto',
        marginTop: '0px',
        marginRight: '0px',
        marginBottom: '0px',
        marginLeft: '0px',
        gap: '0px',
        fontFamily: 'Arial',
        fontSize: '12px',
        fontWeight: '400',
        lineHeight: '18px',
        letterSpacing: '0px',
        whiteSpace: 'normal',
        overflowWrap: 'break-word',
        wordBreak: 'normal',
    };

    const rect: DOMRect = {
        x: 0, y: 0, width: 816, height: 1000,
        top: 0, right: 816, bottom: 1000, left: 0,
        toJSON: () => ({}),
    };

    const el: Partial<HTMLElement> = {
        getBoundingClientRect: vi.fn().mockReturnValue(rect),
        scrollHeight: 950,
        scrollWidth: 816,
        offsetHeight: 950,
        offsetWidth: 816,
        clientHeight: 950,
        clientWidth: 816,
        getAttribute: vi.fn().mockReturnValue(null),
        tagName: 'DIV',
        children: [] as unknown as HTMLCollectionOf<Element>,
        querySelector: vi.fn().mockReturnValue(null),
        querySelectorAll: vi.fn().mockReturnValue([]),
        textContent: 'text content',
        ...overrides,
    };

    vi.spyOn(window, 'getComputedStyle').mockReturnValue(computedStyle as CSSStyleDeclaration);

    return el as unknown as Element;
}

// ─── buildResumeRenderDiagnostics ─────────────────────────────────────────────

describe('buildResumeRenderDiagnostics', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // Mock window.location for capturedAt / url
        Object.defineProperty(window, 'location', {
            value: { href: 'http://localhost/resume', search: '' },
            writable: true,
            configurable: true,
        });
    });

    it('returns diagnosticsVersion matching the constant', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [],
        });
        expect(result.diagnosticsVersion).toBe(RESUME_RENDER_DIAGNOSTICS_VERSION);
    });

    it('returns url from window.location.href', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [],
        });
        expect(result.url).toBe('http://localhost/resume');
    });

    it('returns capturedAt as ISO string', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [],
        });
        expect(new Date(result.capturedAt).toISOString()).toBe(result.capturedAt);
    });

    it('returns intendedPageHeight from first target', () => {
        const el = makeMockElement();
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [{ label: 'page1', element: el, intendedPageHeight: 1056 }],
        });
        expect(result.intendedPageHeight).toBe(1056);
    });

    it('returns null intendedPageHeight when no targets', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [],
        });
        expect(result.intendedPageHeight).toBeNull();
    });

    it('returns formatting object', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [],
        });
        expect(result.formatting).toEqual(defaultFormatting);
    });

    it('produces a missing diagnostic when element is null', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [{ label: 'page1', element: null, intendedPageHeight: 1056 }],
        });

        expect(result.surfaces).toHaveLength(1);
        const diag = result.surfaces[0] as any;
        expect(diag.missing).toBe(true);
        expect(diag.label).toBe('page1');
        expect(diag.reason).toBeTruthy();
        expect(diag.totalIntendedPageHeight).toBe(1056);
    });

    it('produces a missing summaryTable entry when element is null', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [{ label: 'page1', element: null, intendedPageHeight: 1056 }],
        });

        const row = result.summaryTable[0] as any;
        expect(row.missing).toBe(true);
        expect(row.rootHeight).toBeNull();
        expect(row.contentExceedsOnePage).toBeNull();
    });

    it('produces a full diagnostic when element is provided', () => {
        const el = makeMockElement();
        const result = buildResumeRenderDiagnostics({
            phase: 'post-render',
            formatting: defaultFormatting,
            targets: [{ label: 'page1', element: el, intendedPageHeight: 1056 }],
        });

        expect(result.surfaces).toHaveLength(1);
        const diag = result.surfaces[0] as any;
        expect(diag.missing).toBeUndefined();
        expect(diag.label).toBe('page1');
        expect(diag.root).toBeDefined();
        expect(diag.totalIntendedPageHeight).toBe(1056);
    });

    it('sets contentExceedsOnePage=true when scrollHeight > intendedPageHeight+0.5', () => {
        const el = makeMockElement({ scrollHeight: 1200 });
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [{ label: 'p', element: el, intendedPageHeight: 1056 }],
        });
        const diag = result.surfaces[0] as any;
        expect(diag.contentExceedsOnePage).toBe(true);
    });

    it('sets contentExceedsOnePage=false when scrollHeight <= intendedPageHeight+0.5', () => {
        const el = makeMockElement({ scrollHeight: 950 });
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [{ label: 'p', element: el, intendedPageHeight: 1056 }],
        });
        const diag = result.surfaces[0] as any;
        expect(diag.contentExceedsOnePage).toBe(false);
    });

    it('handles multiple targets (some null)', () => {
        const el = makeMockElement();
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [
                { label: 'page1', element: el, intendedPageHeight: 1056 },
                { label: 'page2', element: null, intendedPageHeight: 1056 },
            ],
        });
        expect(result.surfaces).toHaveLength(2);
        expect(result.summaryTable).toHaveLength(2);
    });

    it('includes phase in output', () => {
        const result = buildResumeRenderDiagnostics({
            phase: 'my-phase',
            formatting: defaultFormatting,
            targets: [],
        });
        expect(result.phase).toBe('my-phase');
    });

    it('readChildOverflowTrace handles element with children', () => {
        const childRect: DOMRect = {
            x: 0, y: 0, width: 816, height: 300,
            top: 0, right: 816, bottom: 300, left: 0,
            toJSON: () => ({}),
        };

        const mockChild = {
            getBoundingClientRect: vi.fn().mockReturnValue(childRect),
            getAttribute: vi.fn().mockReturnValue(null),
            tagName: 'SECTION',
            className: 'section-class',
            id: '',
        };

        const childComputedStyle = {
            marginBottom: '8px',
        };

        const el = makeMockElement({
            children: [mockChild] as unknown as HTMLCollectionOf<Element>,
        });

        // Make getComputedStyle return appropriate values for both root and child
        vi.spyOn(window, 'getComputedStyle').mockImplementation((element: Element) => {
            if (element === el) {
                return {
                    paddingTop: '10px', paddingRight: '10px',
                    paddingBottom: '10px', paddingLeft: '10px',
                    borderTopWidth: '0px', borderRightWidth: '0px',
                    borderBottomWidth: '0px', borderLeftWidth: '0px',
                    width: '816px', height: '1056px',
                    boxSizing: 'content-box', overflowX: 'hidden', overflowY: 'auto',
                    marginTop: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '0px',
                    gap: '0px', fontFamily: 'Arial', fontSize: '12px', fontWeight: '400',
                    lineHeight: '18px', letterSpacing: '0px', whiteSpace: 'normal',
                    overflowWrap: 'break-word', wordBreak: 'normal',
                } as unknown as CSSStyleDeclaration;
            }
            return childComputedStyle as unknown as CSSStyleDeclaration;
        });

        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [{ label: 'page', element: el, intendedPageHeight: 1056 }],
        });

        const diag = result.surfaces[0] as any;
        expect(diag.childOverflowTrace).toBeDefined();
        expect(diag.childOverflowTrace.sectionTraces).toHaveLength(1);
    });

    it('summaryTable row has full diagnostic fields when element present', () => {
        const el = makeMockElement();
        const result = buildResumeRenderDiagnostics({
            phase: 'test',
            formatting: defaultFormatting,
            targets: [{ label: 'page1', element: el, intendedPageHeight: 1056 }],
        });

        const row = result.summaryTable[0] as any;
        expect(row.missing).toBe(false);
        expect(row).toHaveProperty('rootHeight');
        expect(row).toHaveProperty('scrollHeight');
        expect(row).toHaveProperty('fontFamily');
        expect(row).toHaveProperty('intendedPageHeight');
        expect(row.intendedPageHeight).toBe(1056);
    });
});
