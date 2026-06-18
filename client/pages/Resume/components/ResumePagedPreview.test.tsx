import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResumePagedPreview } from './ResumePagedPreview';

describe('ResumePagedPreview', () => {
    it('renders clean page frames with measurement content', () => {
        const register = vi.fn();
        const resumeData: any = {
            fullName: 'Ada Lovelace',
            email: 'ada@example.com',
            summary: 'Analytical engineer focused on practical systems.',
            experience: [
                {
                    id: 'exp-1',
                    jobTitle: 'Engineer',
                    company: 'Difference Engines',
                    bullets: [{ id: 'bullet-1', text: 'Built reliable tooling.' }]
                }
            ],
            education: [],
            skills: []
        };

        const { container } = render(
            <ResumePagedPreview
                resumeData={resumeData}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 24,
                    headerFontSize: 16,
                    subHeaderFontSize: 14,
                    bodyFontSize: 12,
                    pageMarginPt: 42,
                    paperLayoutFormat: 'standard',
                    innerSectionGapFormat: 'standard'
                }}
                paperMetrics={{
                    widthPt: 612,
                    heightPt: 792,
                    width: 816,
                    height: 1056,
                    printName: 'Letter',
                    label: 'Letter',
                    standardLabel: 'US & Canada',
                    dimensionLabel: { width: '8.5 in', height: '11 in' }
                }}
                layoutKey="initial-layout"
                pageCount={3}
                pageGapPx={32}
                columnCount={2}
                fontPreviewTarget={null}
                isMarginPreviewVisible={false}
                isPageFormatPreviewVisible={false}
                isSectionGapPreviewVisible={false}
                registerResumeDocumentContentElement={register}
                onRenderedPageCountChange={vi.fn()}
            />
        );

        expect(screen.getByLabelText('Page 1')).toBeTruthy();
        expect(screen.getByLabelText('Page 2')).toBeTruthy();
        expect(screen.getByLabelText('Page 3')).toBeTruthy();
        expect(container.querySelector('.resume-page-preview-measure')).toBeTruthy();
        expect(register).toHaveBeenCalled();
    });

    it('reflows an oversized bullet across pages instead of clipping it', () => {
        const longText = Array.from({ length: 120 }, (_, index) => `word${index}`).join(' ');
        const onRenderedPageCountChange = vi.fn();

        const { container } = render(
            <ResumePagedPreview
                resumeData={{
                    fullName: 'Ada Lovelace',
                    summary: 'Short summary.',
                    experience: [
                        {
                            id: 'exp-1',
                            jobTitle: 'Engineer',
                            company: 'Difference Engines',
                            bullets: [{ id: 'bullet-1', text: longText }]
                        }
                    ],
                    education: [],
                    skills: [{
                        id: 'skill-1',
                        category: 'Languages',
                        items: ['TypeScript', 'React']
                    }]
                } as any}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 24,
                    headerFontSize: 16,
                    subHeaderFontSize: 14,
                    bodyFontSize: 12,
                    pageMarginPt: 42,
                    paperLayoutFormat: 'standard',
                    innerSectionGapFormat: 'standard'
                }}
                paperMetrics={{
                    widthPt: 240,
                    heightPt: 210,
                    width: 320,
                    height: 280,
                    printName: 'Letter',
                    label: 'Letter',
                    standardLabel: 'US & Canada',
                    dimensionLabel: { width: '8.5 in', height: '11 in' }
                }}
                layoutKey="initial-layout"
                pageCount={1}
                pageGapPx={32}
                columnCount={1}
                fontPreviewTarget="body"
                isMarginPreviewVisible={true}
                isPageFormatPreviewVisible={true}
                isSectionGapPreviewVisible={true}
                registerResumeDocumentContentElement={vi.fn()}
                onRenderedPageCountChange={onRenderedPageCountChange}
            />
        );

        const visiblePageText = Array.from(container.querySelectorAll<HTMLElement>('.resume-page-preview-page'))
            .map((page) => page.textContent || '')
            .join(' ');
        expect(screen.getByLabelText('Page 2')).toBeTruthy();
        expect(visiblePageText).toContain('word0');
        expect(visiblePageText).toContain('word119');
        expect(screen.getAllByText(longText)).toHaveLength(1); // hidden measurement copy keeps the unsplit source text
        expect(screen.getAllByText('8.5 in').length).toBeGreaterThan(0);
        expect(onRenderedPageCountChange).toHaveBeenCalled();
    });

    it('uses measured segment heights so preview pages fill available space before wrapping', async () => {
        const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
        HTMLElement.prototype.getBoundingClientRect = function () {
            const segmentId = (this as HTMLElement).dataset.previewSegmentId;
            const height = segmentId ? 12 : 0;
            return {
                x: 0,
                y: 0,
                width: 200,
                height,
                top: 0,
                right: 200,
                bottom: height,
                left: 0,
                toJSON: () => ({})
            } as DOMRect;
        };

        try {
            render(
                <ResumePagedPreview
                    resumeData={{
                        fullName: 'Ada Lovelace',
                        summary: 'Short summary.',
                        experience: [
                            {
                                id: 'exp-1',
                                jobTitle: 'Engineer',
                                company: 'Difference Engines',
                                bullets: Array.from({ length: 6 }, (_, index) => ({
                                    id: `bullet-${index}`,
                                    text: Array.from({ length: 80 }, (_word, wordIndex) => `bullet${index}word${wordIndex}`).join(' ')
                                }))
                            }
                        ],
                        education: [],
                        skills: []
                    } as any}
                    formatting={{
                        pageSize: 'letter',
                        titleFontSize: 24,
                        headerFontSize: 16,
                        subHeaderFontSize: 14,
                        bodyFontSize: 12,
                        pageMarginPt: 24,
                        paperLayoutFormat: 'standard',
                        innerSectionGapFormat: 'standard'
                    }}
                    paperMetrics={{
                        widthPt: 270,
                        heightPt: 315,
                        width: 360,
                        height: 420,
                        printName: 'Letter',
                        label: 'Letter',
                        standardLabel: 'US & Canada',
                        dimensionLabel: { width: '8.5 in', height: '11 in' }
                    }}
                    layoutKey="initial-layout"
                    pageCount={1}
                    pageGapPx={32}
                    columnCount={1}
                    fontPreviewTarget={null}
                    isMarginPreviewVisible={false}
                    isPageFormatPreviewVisible={false}
                    isSectionGapPreviewVisible={false}
                    registerResumeDocumentContentElement={vi.fn()}
                    onRenderedPageCountChange={vi.fn()}
                />
            );

            await waitFor(() => {
                expect(screen.queryByLabelText('Page 2')).toBeNull();
            });
        } finally {
            HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
        }
    });

    it('uses edit-mode typography sizing for title, contact, meta, and date rows', () => {
        render(
            <ResumePagedPreview
                resumeData={{
                    fullName: 'Ada Lovelace',
                    email: 'ada@example.com',
                    experience: [
                        {
                            id: 'exp-1',
                            jobTitle: 'Principal Engineer',
                            company: 'Difference Engines',
                            startDate: 'Jan 2020',
                            endDate: 'Present',
                            bullets: [{ id: 'bullet-1', text: 'Built reliable tooling.' }]
                        }
                    ],
                    education: [
                        {
                            id: 'edu-1',
                            degree: 'MS Computing',
                            school: 'Analytical College',
                            startDate: 'Sep 2018',
                            endDate: 'May 2020',
                            details: [{ id: 'detail-1', text: 'Studied reliable systems.' }]
                        }
                    ],
                    skills: [{
                        id: 'skill-1',
                        category: 'Languages',
                        items: ['TypeScript', 'React']
                    }]
                } as any}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 29,
                    headerFontSize: 17,
                    subHeaderFontSize: 15,
                    bodyFontSize: 13.5,
                    pageMarginPt: 42,
                    paperLayoutFormat: 'standard',
                    innerSectionGapFormat: 'standard'
                }}
                paperMetrics={{
                    widthPt: 612,
                    heightPt: 792,
                    width: 816,
                    height: 1056,
                    printName: 'Letter',
                    label: 'Letter',
                    standardLabel: 'US & Canada',
                    dimensionLabel: { width: '8.5 in', height: '11 in' }
                }}
                layoutKey="initial-layout"
                pageCount={1}
                pageGapPx={32}
                columnCount={1}
                fontPreviewTarget={null}
                isMarginPreviewVisible={false}
                isPageFormatPreviewVisible={false}
                isSectionGapPreviewVisible={false}
                registerResumeDocumentContentElement={vi.fn()}
                onRenderedPageCountChange={vi.fn()}
            />
        );

        const visiblePage = document.querySelector('.resume-page-preview-page') as HTMLElement;
        const findVisibleText = (text: string) => Array.from(visiblePage.querySelectorAll<HTMLElement>('*'))
            .find((element) => element.textContent === text);

        expect(visiblePage).toHaveStyle({
            '--resume-title-font-size': '29pt',
            '--resume-subheader-font-size': '15pt',
            '--resume-body-font-size': '13.5pt'
        });
        expect(findVisibleText('Ada Lovelace')).toHaveStyle({ fontSize: 'var(--resume-title-font-size)' });
        expect(findVisibleText('ada@example.com')).toHaveStyle({ fontSize: 'var(--resume-body-font-size)' });
        expect(findVisibleText('Principal Engineer')).toHaveStyle({ fontSize: 'var(--resume-subheader-font-size)' });
        expect(findVisibleText('Jan 2020')).toHaveStyle({ fontSize: 'var(--resume-subheader-font-size)' });
        expect(findVisibleText('MS Computing')).toHaveStyle({ fontSize: 'var(--resume-subheader-font-size)' });
        expect(findVisibleText('Sep 2018')).toHaveStyle({ fontSize: 'var(--resume-subheader-font-size)' });
        expect(findVisibleText('Languages')).toHaveStyle({ fontSize: 'var(--resume-subheader-font-size)' });
        expect(findVisibleText('TypeScript, React')?.closest('.resume-body-font-target')).toHaveStyle({ fontSize: 'var(--resume-body-font-size)' });
    });

    it('uses the body token for the under-name contact strip in fit preview', () => {
        const baseProps = {
            resumeData: {
                fullName: 'Ada Lovelace',
                email: 'ada@example.com',
                experience: [],
                education: [],
                skills: []
            } as any,
            paperMetrics: {
                widthPt: 612,
                heightPt: 792,
                width: 816,
                height: 1056,
                printName: 'Letter',
                label: 'Letter',
                standardLabel: 'US & Canada',
                dimensionLabel: { width: '8.5 in', height: '11 in' }
            },
            layoutKey: 'contact-body-token',
            pageCount: 1,
            pageGapPx: 32,
            columnCount: 1,
            fontPreviewTarget: null,
            isMarginPreviewVisible: false,
            isPageFormatPreviewVisible: false,
            isSectionGapPreviewVisible: false,
            registerResumeDocumentContentElement: vi.fn(),
            onRenderedPageCountChange: vi.fn()
        };

        const { rerender } = render(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 24,
                    headerFontSize: 16,
                    subHeaderFontSize: 18,
                    bodyFontSize: 10,
                    pageMarginPt: 42,
                    paperLayoutFormat: 'standard',
                    innerSectionGapFormat: 'standard'
                }}
            />
        );

        const findContactStyle = () => {
            const visiblePage = document.querySelector('.resume-page-preview-page') as HTMLElement;
            return Array.from(visiblePage.querySelectorAll<HTMLElement>('*'))
                .find((element) => element.textContent === 'ada@example.com');
        };

        expect(document.querySelector('.resume-page-preview-page')).toHaveStyle({ '--resume-body-font-size': '10pt' });
        expect(findContactStyle()).toHaveStyle({ fontSize: 'var(--resume-body-font-size)' });

        rerender(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 24,
                    headerFontSize: 16,
                    subHeaderFontSize: 18,
                    bodyFontSize: 14,
                    pageMarginPt: 42,
                    paperLayoutFormat: 'standard',
                    innerSectionGapFormat: 'standard'
                }}
            />
        );

        expect(document.querySelector('.resume-page-preview-page')).toHaveStyle({ '--resume-body-font-size': '14pt' });
        expect(findContactStyle()).toHaveStyle({ fontSize: 'var(--resume-body-font-size)' });
    });

    it('applies bottom shelf layout changes across every rendered preview page', () => {
        const resumeData: any = {
            fullName: 'Ada Lovelace',
            summary: 'Analytical engineer focused on practical systems.',
            experience: [],
            education: [],
            skills: []
        };
        const baseProps = {
            resumeData,
            pageCount: 2,
            pageGapPx: 32,
            columnCount: 2,
            fontPreviewTarget: null,
            isMarginPreviewVisible: true,
            isPageFormatPreviewVisible: false,
            isSectionGapPreviewVisible: false,
            registerResumeDocumentContentElement: vi.fn(),
            onRenderedPageCountChange: vi.fn()
        };

        const { container, rerender } = render(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 24,
                    headerFontSize: 16,
                    subHeaderFontSize: 14,
                    bodyFontSize: 12,
                    pageMarginPt: 24,
                    paperLayoutFormat: 'standard',
                    innerSectionGapFormat: 'standard'
                }}
                paperMetrics={{
                    widthPt: 612,
                    heightPt: 792,
                    width: 816,
                    height: 1056,
                    printName: 'Letter',
                    label: 'Letter',
                    standardLabel: 'US & Canada',
                    dimensionLabel: { width: '8.5 in', height: '11 in' }
                }}
                layoutKey="letter-24pt"
            />
        );

        Array.from(container.querySelectorAll<HTMLElement>('.resume-page-preview-page')).forEach((page) => {
            expect(page).toHaveStyle({
                width: '816px',
                height: '1056px',
                '--resume-page-margin': '24pt'
            });
            expect(page.getAttribute('style')).toContain('padding: var(--resume-page-margin)');
        });

        rerender(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'a4',
                    titleFontSize: 26,
                    headerFontSize: 18,
                    subHeaderFontSize: 16,
                    bodyFontSize: 13,
                    pageMarginPt: 54,
                    paperLayoutFormat: 'compact',
                    innerSectionGapFormat: 'compact'
                }}
                paperMetrics={{
                    widthPt: 595.28,
                    heightPt: 841.89,
                    width: 794,
                    height: 1123,
                    printName: 'A4',
                    label: 'A4',
                    standardLabel: 'International',
                    dimensionLabel: { width: '210 mm', height: '297 mm' }
                }}
                layoutKey="a4-54pt"
            />
        );

        Array.from(container.querySelectorAll<HTMLElement>('.resume-page-preview-page')).forEach((page) => {
            expect(page).toHaveStyle({
                width: '794px',
                height: '1123px',
                '--resume-page-margin': '54pt'
            });
            expect(page.getAttribute('style')).toContain('padding: var(--resume-page-margin)');
        });
    });

    it('repaginates content when section gap changes instead of letting content run into page margins', () => {
        const resumeData: any = {
            fullName: 'Ada Lovelace',
            summary: 'Practical systems engineer.',
            experience: [
                {
                    id: 'exp-1',
                    jobTitle: 'Engineer',
                    company: 'Difference Engines',
                    bullets: [
                        { id: 'bullet-1', text: 'Built reliable tooling.' },
                        { id: 'bullet-2', text: 'Improved release quality.' }
                    ]
                }
            ],
            education: [
                {
                    id: 'edu-1',
                    degree: 'BS Computing',
                    school: 'Analytical College',
                    details: [{ id: 'detail-1', text: 'Studied applied mathematics.' }]
                }
            ],
            skills: [
                {
                    id: 'skill-1',
                    category: 'Tools',
                    items: ['TypeScript', 'React']
                }
            ]
        };
        const baseProps = {
            resumeData,
            paperMetrics: {
                widthPt: 270,
                heightPt: 375,
                width: 360,
                height: 500,
                printName: 'Letter',
                label: 'Letter',
                standardLabel: 'US & Canada',
                dimensionLabel: { width: '8.5 in', height: '11 in' }
            },
            pageCount: 1,
            pageGapPx: 32,
            columnCount: 1,
            fontPreviewTarget: null,
            isMarginPreviewVisible: false,
            isPageFormatPreviewVisible: false,
            isSectionGapPreviewVisible: false,
            registerResumeDocumentContentElement: vi.fn(),
            onRenderedPageCountChange: vi.fn()
        };

        const { container, rerender } = render(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 24,
                    headerFontSize: 16,
                    subHeaderFontSize: 14,
                    bodyFontSize: 12,
                    pageMarginPt: 24,
                    paperLayoutFormat: 'relaxed',
                    innerSectionGapFormat: 'standard'
                }}
                layoutKey="relaxed-gap"
            />
        );

        expect(screen.getByLabelText('Page 2')).toBeTruthy();

        rerender(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 24,
                    headerFontSize: 16,
                    subHeaderFontSize: 14,
                    bodyFontSize: 12,
                    pageMarginPt: 24,
                    paperLayoutFormat: 'compact',
                    innerSectionGapFormat: 'standard'
                }}
                layoutKey="compact-gap"
            />
        );

        expect(screen.queryByLabelText('Page 2')).toBeNull();
    });

    it('reflows when font and margin settings change even if the parent layout key is reused', () => {
        const resumeData: any = {
            fullName: 'Ada Lovelace',
            summary: 'Practical systems engineer.',
            experience: [
                {
                    id: 'exp-1',
                    jobTitle: 'Engineer',
                    company: 'Difference Engines',
                    bullets: [
                        { id: 'bullet-1', text: Array.from({ length: 28 }, (_, index) => `alpha${index}`).join(' ') },
                        { id: 'bullet-2', text: Array.from({ length: 28 }, (_, index) => `beta${index}`).join(' ') }
                    ]
                }
            ],
            education: [],
            skills: []
        };
        const baseProps = {
            resumeData,
            paperMetrics: {
                widthPt: 270,
                heightPt: 352.5,
                width: 360,
                height: 470,
                printName: 'Letter',
                label: 'Letter',
                standardLabel: 'US & Canada',
                dimensionLabel: { width: '8.5 in', height: '11 in' }
            },
            layoutKey: 'stable-parent-key',
            pageCount: 1,
            pageGapPx: 32,
            columnCount: 1,
            fontPreviewTarget: null,
            isMarginPreviewVisible: false,
            isPageFormatPreviewVisible: false,
            isSectionGapPreviewVisible: false,
            registerResumeDocumentContentElement: vi.fn(),
            onRenderedPageCountChange: vi.fn()
        };

        const { container, rerender } = render(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 22,
                    headerFontSize: 14,
                    subHeaderFontSize: 12,
                    bodyFontSize: 9,
                    pageMarginPt: 24,
                    paperLayoutFormat: 'compact',
                    innerSectionGapFormat: 'compact'
                }}
            />
        );

        expect(screen.queryByLabelText('Page 2')).toBeNull();

        rerender(
            <ResumePagedPreview
                {...baseProps}
                formatting={{
                    pageSize: 'letter',
                    titleFontSize: 30,
                    headerFontSize: 20,
                    subHeaderFontSize: 18,
                    bodyFontSize: 15,
                    pageMarginPt: 60,
                    paperLayoutFormat: 'relaxed',
                    innerSectionGapFormat: 'relaxed'
                }}
            />
        );

        expect(screen.getByLabelText('Page 2')).toBeTruthy();
        const visiblePageText = Array.from(container.querySelectorAll<HTMLElement>('.resume-page-preview-page'))
            .map((page) => page.textContent || '')
            .join(' ');
        expect(visiblePageText).toContain('beta27');
    });
});
