import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResumeDocumentEditor } from './ResumeDocumentEditor';

vi.mock('@/global-components/ChatMarkdown', () => ({
    ChatMarkdown: ({ content }: { content: string }) => <div data-testid="markdown">{content}</div>
}));

vi.mock('framer-motion', () => {
    const React = require('react');
    const motionDiv = React.forwardRef(({ onHoverStart, onHoverEnd, ...props }: any, ref: any) => {
        return <div ref={ref} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd} {...props} />;
    });
    const motionTextarea = React.forwardRef(({ onHoverStart, onHoverEnd, ...props }: any, ref: any) => {
        return <textarea ref={ref} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd} {...props} />;
    });
    return {
        motion: { div: motionDiv, button: 'button', textarea: motionTextarea, span: 'span', svg: 'svg' },
        AnimatePresence: ({ children }: any) => <>{children}</>
    };
});

vi.mock('./DocumentSection', () => ({
    DocumentSection: ({ children, id, className, onMouseMove, onMouseLeave }: any) => (
        <div
            data-testid="document-section"
            data-section-id={id}
            className={className}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            {children}
        </div>
    )
}));
vi.mock('./AutoResizeTextarea', () => ({
    AutoResizeTextarea: (props: any) => <textarea data-testid="autoresize-textarea" {...props} />
}));

describe('ResumeDocumentEditor', () => {
    let handlers: any;
    let interaction: any;
    let defaultProps: any;

    beforeEach(() => {
        vi.clearAllMocks();
        
        handlers = {
            renderOverlayInput: vi.fn().mockImplementation((props: any) => (
                <div data-testid="overlay-input-wrapper">
                    <input 
                        data-testid={`overlay-input-${props.path}`} 
                        value={props.value || ''} 
                        onChange={(e) => props.onChange(e.target.value)}
                        onBlur={props.onBlur}
                        onKeyDown={props.onKeyDown}
                    />
                    {props.onDelete && (
                        <button type="button" aria-label="Delete bullet" onClick={props.onDelete}>
                            Delete
                        </button>
                    )}
                </div>
            )),
            renderRewriteActionButtons: vi.fn(),
            getDynamicInputStyle: vi.fn().mockReturnValue({}),
            contactFieldStyle: vi.fn().mockReturnValue({}),
            subHeaderFieldStyle: vi.fn().mockReturnValue({}),
            isFieldChanged: vi.fn().mockReturnValue({ changed: false }),
            getSuggestionReviewClass: vi.fn().mockReturnValue(''),
            updateField: vi.fn(),
            updateSectionTitle: vi.fn(),
            addCustomContactField: vi.fn(),
            updateCustomContactField: vi.fn(),
            removeCustomContactField: vi.fn(),
            removeStandardContactField: vi.fn(),
            updateExperienceField: vi.fn(),
            insertExperienceAt: vi.fn(),
            removeExperience: vi.fn(),
            clearExperience: vi.fn(),
            addBulletWithText: vi.fn(),
            insertBulletAfter: vi.fn(),
            updateBulletText: vi.fn(),
            removeBulletIfEmpty: vi.fn(),
            removeBullet: vi.fn(),
            toggleBulletTag: vi.fn(),
            createAndAssignBulletTag: vi.fn(),
            updateEducationField: vi.fn(),
            addEducation: vi.fn(),
            removeEducation: vi.fn(),
            moveEducationUp: vi.fn(),
            moveEducationDown: vi.fn(),
            addEducationDetailWithText: vi.fn(),
            insertEducationDetailAfter: vi.fn(),
            updateEducationDetailText: vi.fn(),
            removeEducationDetailIfEmpty: vi.fn(),
            addSkillCategory: vi.fn(),
            createSkillCategory: vi.fn().mockReturnValue('draft-id'),
            updateSkillCategoryName: vi.fn(),
            updateSkillCategoryItems: vi.fn(),
            removeSkillCategory: vi.fn(),
            removeSkillCategoryIfEmpty: vi.fn(),
            moveSkillCategoryUp: vi.fn(),
            moveSkillCategoryDown: vi.fn(),
            clearSkillCategory: vi.fn(),
            handleAnalyzeSummary: vi.fn(),
            handleImproveSummary: vi.fn(),
            handleImproveExperience: vi.fn(),
            acceptSummaryRewriteSuggestion: vi.fn(),
            rejectSummaryRewriteSuggestion: vi.fn(),
            acceptExperienceRewriteSuggestion: vi.fn(),
            rejectExperienceRewriteSuggestion: vi.fn(),
            setResumeData: vi.fn(),
            setChangeMetadata: vi.fn(),
            setSuccessMessage: vi.fn()
        };

        interaction = {
            activeDocumentSection: null,
            focusedDocumentSection: null,
            setActiveDocumentSection: vi.fn(),
            setFocusedField: vi.fn(),
            hoveredNameSection: false,
            setHoveredNameSection: vi.fn(),
            focusedNameSection: false,
            setFocusedNameSection: vi.fn(),
            hoveredContactField: null,
            setHoveredContactField: vi.fn(),
            focusedContactField: null,
            setFocusedContactField: vi.fn(),
            hoveredSummary: false,
            setHoveredSummary: vi.fn(),
            focusedSummary: false,
            setFocusedSummary: vi.fn(),
            isSummaryImproveHovered: false,
            setIsSummaryImproveHovered: vi.fn(),
            hoveredJobId: null,
            setHoveredJobId: vi.fn(),
            hoveredEducationId: null,
            setHoveredEducationId: vi.fn(),
            hoveredSkillId: null,
            setHoveredSkillId: vi.fn(),
            hoveredExperienceImproveId: null,
            setHoveredExperienceImproveId: vi.fn(),
            hoveredExperienceClearId: null,
            setHoveredExperienceClearId: vi.fn(),
            hoveredExperienceDeleteId: null,
            setHoveredExperienceDeleteId: vi.fn(),
            hoveredEducationClearId: null,
            setHoveredEducationClearId: vi.fn(),
            hoveredEducationDeleteId: null,
            setHoveredEducationDeleteId: vi.fn(),
            hoveredSkillClearId: null,
            setHoveredSkillClearId: vi.fn(),
            hoveredSkillDeleteId: null,
            setHoveredSkillDeleteId: vi.fn(),
            rewriteActionHover: null,
            setRewriteActionHover: vi.fn(),
            isExperienceSectionActive: false,
            isSummarySectionActive: false,
            summaryRewriteHoverAction: null,
            summaryCurrentRewriteClass: '',
            gapPreviewTarget: null,
            loadingSummaryImprove: false,
            loadingExperienceImproveId: null
        };

        defaultProps = {
            data: {
                resumeData: { 
                    fullName: 'John Doe',
                    contact: {}, 
                    summary: 'Summary text', 
                    experiences: [], 
                    education: [], 
                    skills: [] 
                },
                headerContactRows: [
                    [{ key: 'email', value: 'a@b.com', isCustom: false, index: 0, placeholder: 'Email' }],
                    [{ key: 'custom1', value: 'Custom', isCustom: true, index: 1, placeholder: 'Custom' }]
                ],
                showHeaderContactEditors: true,
                changeMetadata: [],
                originalResumeDataBeforeDraft: null,
                summaryRewriteSuggestion: null,
                experienceRewriteSuggestions: {}
            },
            formatting: {
                titleFontSize: 24,
                bodyFontSize: 12,
                pageMarginPt: 36,
                documentSectionGapStyle: {},
                documentSectionGapPx: 10,
                documentInnerSectionGapStyle: {},
                documentInnerSectionGapPx: 8,
                documentTextStyle: {},
                sectionHeadingClass: '',
                sectionHeadingStyle: {},
                inputStyleClass: '',
                boldInputClass: '',
                compactFitMetaInputClass: '',
                compactFitDateInputClass: '',
                contactInputClass: '',
                resumeDividerClass: '',
                headerMarginAddClass: '',
                experienceMarginAddClass: '',
                experienceMarginImproveClass: '',
                experienceMarginClearClass: '',
                experienceMarginDeleteClass: '',
                summaryMarginImproveClass: ''
            },
            interaction,
            handlers
        };
    });

    it('renders and handles full name changes and focus', () => {
        render(<ResumeDocumentEditor {...defaultProps} />);
        const nameInput = screen.getByDisplayValue('John Doe');
        
        fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
        expect(handlers.updateField).toHaveBeenCalledWith('fullName', 'Jane Doe');

        fireEvent.focus(nameInput);
        expect(interaction.setFocusedNameSection).toHaveBeenCalledWith(true);

        fireEvent.blur(nameInput);
        expect(interaction.setFocusedNameSection).toHaveBeenCalledWith(false);
    });

    it('handles contact field updates and removes empty fields on blur', () => {
        interaction.hoveredContactField = 'email';
        interaction.focusedContactField = 'custom1';
        
        render(<ResumeDocumentEditor {...defaultProps} />);
        
        const customInput = screen.getByDisplayValue('Custom');
        expect(document.activeElement).toBe(customInput);
        fireEvent.change(customInput, { target: { value: 'Custom 2' } });
        expect(handlers.updateCustomContactField).toHaveBeenCalledWith(1, 'value', 'Custom 2');

        const emailInput = screen.getByDisplayValue('a@b.com');
        fireEvent.change(emailInput, { target: { value: 'c@d.com' } });
        expect(handlers.updateField).toHaveBeenCalledWith('email', 'c@d.com');

        fireEvent.change(emailInput, { target: { value: '' } });
        fireEvent.blur(emailInput, { target: { value: '' } });
        expect(handlers.removeStandardContactField).toHaveBeenCalledWith('email');

        fireEvent.change(customInput, { target: { value: '' } });
        fireEvent.blur(customInput, { target: { value: '' } });
        expect(handlers.removeCustomContactField).toHaveBeenCalledWith(1);
        expect(screen.queryByTitle('Delete')).toBeNull();
    });

    it('handles add custom contact field button', () => {
        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        expect(container.querySelector('.resume-editor-contact-strip')).toHaveClass(
            'resume-document__contact-strip'
        );
        expect(container.querySelector('.resume-editor-contact-row')).toHaveClass(
            'resume-document__contact-row'
        );
        const btn = screen.getByLabelText('Add contact metadata field');
        fireEvent.click(btn);
        expect(handlers.addCustomContactField).toHaveBeenCalled();
    });

    it('handles summary changes and improve button', () => {
        render(<ResumeDocumentEditor {...defaultProps} />);
        const summaryInput = screen.getByDisplayValue('Summary text');
        
        fireEvent.change(summaryInput, { target: { value: 'New summary' } });
        expect(handlers.updateField).toHaveBeenCalledWith('summary', 'New summary');

        const improveBtn = screen.getByLabelText('AI Rewrite Summary');
        fireEvent.click(improveBtn);
        expect(handlers.handleImproveSummary).toHaveBeenCalled();
    });

    it('renders with loading summary improvement', () => {
        interaction.loadingSummaryImprove = true;
        render(<ResumeDocumentEditor {...defaultProps} />);
        expect(screen.getByText('Generating summary rewrite...')).toBeTruthy();
    });

    it('handles work experience rendering and interactions', () => {
        defaultProps.data.resumeData.experience = [
            { id: 'exp1', jobTitle: 'Dev', company: 'Corp', startDate: '2020', endDate: '2021', location: 'Remote', bullets: [{ id: 'b1', text: 'work' }] },
            { id: 'exp_empty', jobTitle: '', company: '', startDate: '', endDate: '', location: '', bullets: [] } // Triggers line 557
        ];
        
        const newInteraction = { ...defaultProps.interaction, isExperienceSectionActive: true, activeDocumentSection: 'experience', hoveredExperienceDeleteId: 'exp1' } as any;
        const newProps = { ...defaultProps, interaction: newInteraction };
        const { container, rerender } = render(<ResumeDocumentEditor {...newProps} />);
        const experienceControls = container.querySelectorAll(
            '[data-section-id="experience"] .resume-editor-item-control'
        );
        expect(experienceControls).toHaveLength(10);
        expect(container.querySelectorAll(
            '[data-section-id="experience"] .resume-editor-control-icon'
        )).toHaveLength(10);
        
        const jobInput = screen.getByDisplayValue('Dev');
        fireEvent.change(jobInput, { target: { value: 'Dev 2' } });
        expect(handlers.updateExperienceField).toHaveBeenCalledWith('exp1', 'jobTitle', 'Dev 2');

        const companyInput = screen.getByDisplayValue('Corp');
        fireEvent.change(companyInput, { target: { value: 'Corp 2' } });
        expect(handlers.updateExperienceField).toHaveBeenCalledWith('exp1', 'company', 'Corp 2');

        const locationInput = screen.getByDisplayValue('Remote');
        fireEvent.change(locationInput, { target: { value: 'Office' } });
        expect(handlers.updateExperienceField).toHaveBeenCalledWith('exp1', 'location', 'Office');

        const startDateInput = screen.getByDisplayValue('2020');
        fireEvent.change(startDateInput, { target: { value: '2019' } });
        expect(handlers.updateExperienceField).toHaveBeenCalledWith('exp1', 'startDate', '2019');

        const endDateInput = screen.getByDisplayValue('2021');
        fireEvent.change(endDateInput, { target: { value: '2022' } });
        expect(handlers.updateExperienceField).toHaveBeenCalledWith('exp1', 'endDate', '2022');

        rerender(<ResumeDocumentEditor {...newProps} />);

        // Trigger line 557 by changing activeDocumentSection and isExperienceSectionActive
        newInteraction.activeDocumentSection = null;
        newInteraction.isExperienceSectionActive = false;
        rerender(<ResumeDocumentEditor {...newProps} />);
        
        // Restore active section
        newInteraction.activeDocumentSection = 'experience';
        newInteraction.isExperienceSectionActive = true;
        rerender(<ResumeDocumentEditor {...newProps} />);

        // Improve AI Button
        const improveBtn = screen.getAllByTitle('Improve work experience with AI')[0];
        fireEvent.mouseEnter(improveBtn);
        expect(newInteraction.setHoveredExperienceImproveId).toHaveBeenCalledWith('exp1');
        fireEvent.mouseLeave(improveBtn);
        expect(newInteraction.setHoveredExperienceImproveId).toHaveBeenCalledWith(null);
        fireEvent.click(improveBtn);
        expect(handlers.handleImproveExperience).toHaveBeenCalledWith(defaultProps.data.resumeData.experience[0]);

        // Clear experience
        const clearBtn = screen.getAllByTitle('Clear work experience')[0];
        fireEvent.mouseEnter(clearBtn);
        expect(newInteraction.setHoveredExperienceClearId).toHaveBeenCalledWith('exp1');
        fireEvent.mouseLeave(clearBtn);
        expect(newInteraction.setHoveredExperienceClearId).toHaveBeenCalledWith(null);
        fireEvent.click(clearBtn);
        expect(handlers.clearExperience).toHaveBeenCalledWith('exp1');

        // Delete experience
        const delBtn = screen.getAllByTitle('Remove work experience')[0];
        fireEvent.click(delBtn);
        expect(handlers.removeExperience).toHaveBeenCalledWith('exp1');
    });

    it('shows the add-bullet composer only for the hovered experience item', () => {
        defaultProps.data.resumeData.experience = [
            {
                id: 'exp1',
                jobTitle: 'Engineer',
                company: 'One',
                startDate: '2020',
                endDate: '2022',
                bullets: [{ id: 'b1', text: 'Built one' }]
            },
            {
                id: 'exp2',
                jobTitle: 'Lead',
                company: 'Two',
                startDate: '2022',
                endDate: '2024',
                bullets: [{ id: 'b2', text: 'Built two' }]
            }
        ];
        interaction.activeDocumentSection = 'experience';
        interaction.isExperienceSectionActive = true;

        const { container, rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        expect(screen.queryByPlaceholderText('Type to add a new bullet...')).toBeNull();
        const experienceItems = container.querySelectorAll(
            '[data-section-id="experience"] .resume-editor-item'
        );
        expect(experienceItems).toHaveLength(2);
        experienceItems.forEach((item) => {
            expect(item).toHaveAttribute('data-section-active', 'true');
            expect(item).toHaveAttribute('data-controls-visible', 'false');
        });
        const improveButtons = screen.getAllByTitle('Improve work experience with AI');
        improveButtons.forEach((button) => expect(button).not.toHaveClass('is-visible'));

        interaction.hoveredJobId = 'exp2';
        rerender(<ResumeDocumentEditor {...defaultProps} />);

        expect(screen.getAllByPlaceholderText('Type to add a new bullet...')).toHaveLength(1);
        expect(experienceItems[0]).toHaveAttribute('data-controls-visible', 'false');
        expect(experienceItems[1]).toHaveAttribute('data-controls-visible', 'true');
        expect(improveButtons[0]).not.toHaveClass('is-visible');
        expect(improveButtons[1]).toHaveClass('is-visible');
    });

    it('shows missing metadata fields only for the hovered experience', () => {
        defaultProps.data.resumeData.experience = [
            {
                id: 'exp1',
                jobTitle: 'Engineer',
                company: '',
                location: '',
                startDate: '',
                endDate: '2024',
                bullets: [{ id: 'b1', text: 'Built things' }]
            }
        ];
        interaction.activeDocumentSection = 'experience';
        interaction.isExperienceSectionActive = true;

        const { container, rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        const stableFieldCount = container.querySelectorAll(
            '[data-testid^="overlay-input-experience."]'
        ).length;

        interaction.hoveredJobId = 'exp1';
        rerender(<ResumeDocumentEditor {...defaultProps} />);

        expect(container.querySelectorAll(
            '[data-testid^="overlay-input-experience."]'
        ).length).toBeGreaterThan(stableFieldCount);
        expect(screen.getByTestId('overlay-input-experience.0.company')).toBeTruthy();
        expect(screen.getByTestId('overlay-input-experience.0.location')).toBeTruthy();
        expect(screen.getByTestId('overlay-input-experience.0.startDate')).toBeTruthy();
    });

    it('renders inner gap previews between repeated edit rows', () => {
        defaultProps.data.resumeData.experience = [
            { id: 'exp1', jobTitle: 'Engineer', bullets: [{ id: 'b1', text: 'Built things' }] },
            { id: 'exp2', jobTitle: 'Lead', bullets: [{ id: 'b2', text: 'Led things' }] }
        ];
        defaultProps.data.resumeData.education = [
            { id: 'edu1', degree: 'BS', school: 'School' },
            { id: 'edu2', degree: 'MS', school: 'Other School' }
        ];
        defaultProps.data.resumeData.skills = [
            { id: 'skill1', category: 'Languages', items: ['TypeScript'] },
            { id: 'skill2', category: 'Tools', items: ['Vite'] }
        ];
        defaultProps.interaction.gapPreviewTarget = 'inner';

        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);

        const innerPreviews = container.querySelectorAll('.resume-inner-section-gap-preview');
        expect(innerPreviews).toHaveLength(3);
        innerPreviews.forEach((preview) => {
            expect(preview).not.toHaveAttribute('style');
            expect(preview).toHaveClass('resume-inner-section-gap-preview');
        });
    });

    it('handles experience bullet updates and deletions', () => {
        defaultProps.data.resumeData.experience = [
            { id: 'exp1', jobTitle: 'Dev', bullets: [{ id: 'b1', text: 'Did work' }] }
        ];
        interaction.isExperienceSectionActive = true;
        
        const { rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        const bulletInput = screen.getByDisplayValue('Did work');
        fireEvent.change(bulletInput, { target: { value: 'Did more' } });
        expect(handlers.updateBulletText).toHaveBeenCalledWith('exp1', 'b1', 'Did more');

        const delBtns = screen.getAllByLabelText(/Delete bullet/i);
        fireEvent.click(delBtns[0]);
        expect(handlers.removeBullet).toHaveBeenCalledWith('exp1', 'b1');

        const delExpBtn = screen.getByTitle('Remove work experience');
        fireEvent.mouseEnter(delExpBtn);
        expect(interaction.setHoveredExperienceDeleteId).toHaveBeenCalledWith('exp1');
        fireEvent.mouseLeave(delExpBtn);
        expect(interaction.setHoveredExperienceDeleteId).toHaveBeenCalledWith(null);

        // Test experience rewrite suggestions
        defaultProps.data.experienceRewriteSuggestions = {
            exp1: { items: [{ bulletId: 'b1', suggestedText: 'Better text', originalText: 'Did work', isStreaming: false }] }
        };
        rerender(<ResumeDocumentEditor {...defaultProps} />);
        
        const rewriteCalls = (handlers.renderRewriteActionButtons as any).mock.calls;
        const lastCallParams = rewriteCalls[rewriteCalls.length - 1][0];
        
        lastCallParams.onAccept();
        expect(handlers.acceptExperienceRewriteSuggestion).toHaveBeenCalledWith('exp1', 'b1');
        
        lastCallParams.onReject();
        expect(handlers.rejectExperienceRewriteSuggestion).toHaveBeenCalledWith('exp1', 'b1');
        
        lastCallParams.onAcceptHover();
        expect(interaction.setRewriteActionHover).toHaveBeenCalledWith({ target: "experience", bulletId: 'b1', action: "accept" });
        
        lastCallParams.onRejectHover();
        expect(interaction.setRewriteActionHover).toHaveBeenCalledWith({ target: "experience", bulletId: 'b1', action: "reject" });
        
        lastCallParams.onClearHover();
        expect(interaction.setRewriteActionHover).toHaveBeenCalledWith(null);
    });

    it('handles adding experience and bullets', () => {
        defaultProps.data.resumeData.experience = [
            { id: 'exp1', jobTitle: 'Dev', bullets: [] }
        ];
        interaction.isExperienceSectionActive = true;
        interaction.activeDocumentSection = 'experience';
        interaction.hoveredJobId = 'exp1';
        
        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        const addExpBtn = screen.getByTitle('Add experience');
        fireEvent.click(addExpBtn);
        expect(handlers.insertExperienceAt).toHaveBeenCalledWith(1);

        const addBulletInput = screen.getAllByPlaceholderText('Type to add a new bullet...')[0];
        fireEvent.change(addBulletInput, { target: { value: 'New bullet' } });
        expect(handlers.addBulletWithText).not.toHaveBeenCalled();
        fireEvent.keyDown(addBulletInput, { key: 'Enter' });
        expect(handlers.addBulletWithText).toHaveBeenCalledWith('exp1', 'New bullet');

        const experienceSection = container.querySelector(
            '[data-section-id="experience"]'
        ) as HTMLElement;
        const jobDiv = experienceSection.querySelector(
            '[data-experience-item-id="exp1"]'
        ) as HTMLElement;
        jobDiv.getBoundingClientRect = () => ({
            x: 100,
            y: 100,
            top: 100,
            right: 500,
            bottom: 200,
            left: 100,
            width: 400,
            height: 100,
            toJSON: () => ({})
        });
        fireEvent.mouseMove(experienceSection, { clientX: 200, clientY: 150 });
        const proximityUpdate = (interaction.setHoveredJobId as any).mock.lastCall[0];
        expect(proximityUpdate(null)).toBe('exp1');
        fireEvent.mouseLeave(experienceSection);
        expect(interaction.setHoveredJobId).toHaveBeenCalledWith(null);
    });

    it('activates the experience item closest to the pointer', () => {
        defaultProps.data.resumeData.experience = [
            { id: 'exp1', jobTitle: 'First', bullets: [{ id: 'b1', text: 'One' }] },
            { id: 'exp2', jobTitle: 'Second', bullets: [{ id: 'b2', text: 'Two' }] }
        ];
        interaction.activeDocumentSection = 'experience';
        interaction.isExperienceSectionActive = true;

        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        const section = container.querySelector(
            '[data-section-id="experience"]'
        ) as HTMLElement;
        const firstItem = section.querySelector(
            '[data-experience-item-id="exp1"]'
        ) as HTMLElement;
        const secondItem = section.querySelector(
            '[data-experience-item-id="exp2"]'
        ) as HTMLElement;
        firstItem.getBoundingClientRect = () => ({
            x: 100, y: 100, top: 100, right: 500, bottom: 180, left: 100,
            width: 400, height: 80, toJSON: () => ({})
        });
        secondItem.getBoundingClientRect = () => ({
            x: 100, y: 240, top: 240, right: 500, bottom: 360, left: 100,
            width: 400, height: 120, toJSON: () => ({})
        });

        fireEvent.mouseMove(section, { clientX: 80, clientY: 220 });
        const firstUpdate = (interaction.setHoveredJobId as any).mock.lastCall[0];
        expect(firstUpdate(null)).toBe('exp2');

        fireEvent.mouseMove(section, { clientX: 80, clientY: 140 });
        const secondUpdate = (interaction.setHoveredJobId as any).mock.lastCall[0];
        expect(secondUpdate('exp2')).toBe('exp1');
    });

    it('keeps experience proximity active through the left tag interaction wing', () => {
        defaultProps.data.resumeData.experience = [
            { id: 'exp1', jobTitle: 'First', bullets: [{ id: 'b1', text: 'One' }] },
            { id: 'exp2', jobTitle: 'Second', bullets: [{ id: 'b2', text: 'Two' }] }
        ];
        interaction.activeDocumentSection = 'experience';
        interaction.isExperienceSectionActive = true;

        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        const section = container.querySelector(
            '[data-section-id="experience"]'
        ) as HTMLElement;
        const firstItem = section.querySelector(
            '[data-experience-item-id="exp1"]'
        ) as HTMLElement;
        const secondItem = section.querySelector(
            '[data-experience-item-id="exp2"]'
        ) as HTMLElement;
        firstItem.getBoundingClientRect = () => ({
            x: 100, y: 100, top: 100, right: 500, bottom: 180, left: 100,
            width: 400, height: 80, toJSON: () => ({})
        });
        secondItem.getBoundingClientRect = () => ({
            x: 100, y: 240, top: 240, right: 500, bottom: 320, left: 100,
            width: 400, height: 80, toJSON: () => ({})
        });
        const secondWing = section.querySelector(
            '[data-experience-hit-wing="exp2"]'
        ) as HTMLElement;

        fireEvent.mouseMove(secondWing, { clientX: -40, clientY: 270 });
        const proximityUpdate = (interaction.setHoveredJobId as any).mock.lastCall[0];
        expect(proximityUpdate(null)).toBe('exp2');
    });

    it('handles education rendering and interactions', () => {
        defaultProps.data.resumeData.education = [
            { id: 'edu1', degree: 'BS', school: 'Uni', location: 'City', startDate: '2016', endDate: '2020', details: [{ id: 'd1', text: 'Detail' }] },
            { id: 'edu_empty', degree: '', school: '', location: '', startDate: '', endDate: '', details: [] } // Triggers line 866
        ];
        
        const { rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        const degreeInput = screen.getByDisplayValue('BS');
        fireEvent.change(degreeInput, { target: { value: 'MS' } });
        expect(handlers.updateEducationField).toHaveBeenCalledWith('edu1', 'degree', 'MS');

        const schoolInput = screen.getByDisplayValue('Uni');
        fireEvent.change(schoolInput, { target: { value: 'MIT' } });
        expect(handlers.updateEducationField).toHaveBeenCalledWith('edu1', 'school', 'MIT');

        const startDateInput = screen.getByDisplayValue('2016');
        fireEvent.change(startDateInput, { target: { value: '2017' } });
        expect(handlers.updateEducationField).toHaveBeenCalledWith('edu1', 'startDate', '2017');

        const endDateInput = screen.getByDisplayValue('2020');
        fireEvent.change(endDateInput, { target: { value: '2021' } });
        expect(handlers.updateEducationField).toHaveBeenCalledWith('edu1', 'endDate', '2021');

        // Need hoveredEducationDeleteId to see delete button
        interaction.hoveredEducationDeleteId = 'edu1';
        rerender(<ResumeDocumentEditor {...defaultProps} />);
        
        const addEduBtn = screen.getByTitle('Add education');
        fireEvent.click(addEduBtn);
        expect(handlers.addEducation).toHaveBeenCalled();

        const delBtn = screen.getAllByLabelText('Remove education')[0];
        const moveUpBtn = screen.getAllByLabelText('Move education up')[0];
        const moveDownBtn = screen.getAllByLabelText('Move education down')[0];
        expect(moveUpBtn).toBeDisabled();
        fireEvent.click(moveUpBtn);
        expect(handlers.moveEducationUp).not.toHaveBeenCalled();
        fireEvent.click(moveDownBtn);
        expect(handlers.moveEducationDown).toHaveBeenCalledWith('edu1');
        fireEvent.mouseEnter(delBtn);
        expect(interaction.setHoveredEducationDeleteId).toHaveBeenCalledWith('edu1');
        fireEvent.mouseLeave(delBtn);
        expect(interaction.setHoveredEducationDeleteId).toHaveBeenCalledWith(null);
        fireEvent.click(delBtn);
        expect(handlers.removeEducation).toHaveBeenCalledWith('edu1');

        interaction.activeDocumentSection = 'education';
        interaction.hoveredEducationId = 'edu1';
        rerender(<ResumeDocumentEditor {...defaultProps} />);

        // Test education detail update
        const existingDetailInput = screen.getByDisplayValue('Detail');
        fireEvent.change(existingDetailInput, { target: { value: 'Updated Detail' } });
        expect(handlers.updateEducationDetailText).toHaveBeenCalledWith('edu1', 'd1', 'Updated Detail');

        // Test education add detail input
        const eduDetailInput = screen.getAllByPlaceholderText('Type to add concentration, honors, coursework...')[0];
        fireEvent.change(eduDetailInput, { target: { value: 'New Detail' } });
        expect(handlers.addEducationDetailWithText).not.toHaveBeenCalled();
        fireEvent.keyDown(eduDetailInput, { key: 'Enter' });
        expect(handlers.addEducationDetailWithText).toHaveBeenCalledWith('edu1', 'New Detail');
        
        // Don't call add with empty text
        fireEvent.change(eduDetailInput, { target: { value: '  ' } });
        expect(handlers.addEducationDetailWithText).toHaveBeenCalledTimes(1);
    });

    it('keeps education document fields stable when the section becomes active', () => {
        defaultProps.data.resumeData.education = [
            {
                id: 'edu1',
                degree: 'BS',
                school: '',
                startDate: '',
                endDate: '2020',
                details: [{ id: 'empty-detail', text: '' }]
            },
            {
                id: 'edu2',
                degree: 'MS',
                school: 'Other School',
                startDate: '2021',
                endDate: '2023',
                details: [{ id: 'detail', text: 'Honors' }]
            }
        ];

        const { container, rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        const stableFieldCount = container.querySelectorAll(
            '[data-testid^="overlay-input-education."]'
        ).length;
        const stableItemCount = container.querySelectorAll(
            '[data-section-id="education"] .resume-editor-item'
        ).length;

        interaction.activeDocumentSection = 'education';
        rerender(<ResumeDocumentEditor {...defaultProps} />);

        expect(container.querySelectorAll(
            '[data-testid^="overlay-input-education."]'
        )).toHaveLength(stableFieldCount);
        expect(container.querySelectorAll(
            '[data-section-id="education"] .resume-editor-item'
        )).toHaveLength(stableItemCount);
        expect(screen.queryByPlaceholderText('Institution Name')).toBeNull();
        expect(screen.queryByPlaceholderText('Start')).toBeNull();
    });

    it('picks the nearest education item when the section is active', () => {
        defaultProps.data.resumeData.education = [
            {
                id: 'edu1',
                degree: 'BS',
                school: 'First',
                startDate: '2016',
                endDate: '2020',
                details: [{ id: 'd1', text: 'Detail 1' }]
            },
            {
                id: 'edu2',
                degree: 'MS',
                school: 'Second',
                startDate: '2021',
                endDate: '2023',
                details: [{ id: 'd2', text: 'Detail 2' }]
            }
        ];
        interaction.activeDocumentSection = 'education';

        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        const educationSection = screen.getAllByTestId('document-section')
            .find((section) => section.getAttribute('data-section-id') === 'education');
        const educationItems = container.querySelectorAll('[data-education-item-id]');
        const firstItem = educationItems[0] as HTMLElement;
        const secondItem = educationItems[1] as HTMLElement;

        firstItem.getBoundingClientRect = vi.fn(() => ({
            left: 0, top: 0, right: 300, bottom: 100, width: 300, height: 100, x: 0, y: 0, toJSON: () => ({})
        })) as any;
        secondItem.getBoundingClientRect = vi.fn(() => ({
            left: 0, top: 220, right: 300, bottom: 320, width: 300, height: 100, x: 0, y: 220, toJSON: () => ({})
        })) as any;

        fireEvent.mouseMove(educationSection!, { clientX: 40, clientY: 270 });
        const proximityUpdate = (interaction.setHoveredEducationId as any).mock.lastCall[0];
        expect(proximityUpdate(null)).toBe('edu2');

        fireEvent.mouseLeave(educationSection!);
        expect(interaction.setHoveredEducationId).toHaveBeenCalledWith(null);
    });

    it('handles skills rendering and interactions', () => {
        defaultProps.data.resumeData.skills = [
            { id: 's1', category: 'Lang', items: ['JS', 'TS'] }
        ];
        
        const { container, rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        const nameInput = screen.getByDisplayValue('Lang');
        fireEvent.change(nameInput, { target: { value: 'Lang2' } });
        expect(handlers.updateSkillCategoryName).toHaveBeenCalledWith('s1', 'Lang2');

        const itemsInput = screen.getByDisplayValue('JS, TS');
        fireEvent.change(itemsInput, { target: { value: 'JS, TS, Python' } });
        expect(handlers.updateSkillCategoryItems).toHaveBeenCalledWith('s1', 'JS, TS, Python');

        // Make the section active to render the draft skill category template
        interaction.activeDocumentSection = 'skills';
        rerender(<ResumeDocumentEditor {...defaultProps} />);

        const addSkillInput = screen.getByPlaceholderText('Add Skill');
        fireEvent.change(addSkillInput, { target: { value: 'New Skill Cat' } });
        expect(handlers.createSkillCategory).toHaveBeenCalledWith('', '');
        expect(handlers.updateSkillCategoryName).toHaveBeenCalledWith('draft-id', 'New Skill Cat');

        interaction.activeDocumentSection = 'skills';
        interaction.hoveredSkillId = 's1';
        rerender(<ResumeDocumentEditor {...defaultProps} />);
        
        const moveSkillUpBtn = screen.getAllByLabelText('Move skill category up')[0];
        const moveSkillDownBtn = screen.getAllByLabelText('Move skill category down')[0];

        expect(moveSkillUpBtn).toBeDisabled();
        fireEvent.click(moveSkillUpBtn);
        expect(handlers.moveSkillCategoryUp).not.toHaveBeenCalled();

        expect(moveSkillDownBtn).toBeDisabled();
        fireEvent.click(moveSkillDownBtn);
        expect(handlers.moveSkillCategoryDown).not.toHaveBeenCalled();

        // Verify empty deletion is triggered on blur of the skill row
        const skillRow = container.querySelector('.resume-editor-skill-row') as HTMLElement;
        fireEvent.blur(skillRow);
        expect(handlers.removeSkillCategoryIfEmpty).toHaveBeenCalledWith('s1');
    });

    it('picks the nearest skill item when the section is active', () => {
        defaultProps.data.resumeData.skills = [
            { id: 's1', category: 'Lang', items: ['JS', 'TS'] },
            { id: 's2', category: 'Tools', items: ['Git', 'Docker'] }
        ];
        interaction.activeDocumentSection = 'skills';

        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        const skillsSection = screen.getAllByTestId('document-section')
            .find((section) => section.getAttribute('data-section-id') === 'skills');
        const skillItems = container.querySelectorAll('[data-skill-item-id]');
        const firstItem = skillItems[0] as HTMLElement;
        const secondItem = skillItems[1] as HTMLElement;

        firstItem.getBoundingClientRect = vi.fn(() => ({
            left: 0, top: 0, right: 300, bottom: 60, width: 300, height: 60, x: 0, y: 0, toJSON: () => ({})
        })) as any;
        secondItem.getBoundingClientRect = vi.fn(() => ({
            left: 0, top: 140, right: 300, bottom: 200, width: 300, height: 60, x: 0, y: 140, toJSON: () => ({})
        })) as any;

        fireEvent.mouseMove(skillsSection!, { clientX: 40, clientY: 180 });
        const proximityUpdate = (interaction.setHoveredSkillId as any).mock.lastCall[0];
        expect(proximityUpdate(null)).toBe('s2');

        fireEvent.mouseLeave(skillsSection!);
        expect(interaction.setHoveredSkillId).toHaveBeenCalledWith(null);
    });

    it('handles hover effects', () => {
        const { container, rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        
        // Full name hover
        const nameDiv = screen.getByDisplayValue('John Doe').parentElement!;
        fireEvent.mouseEnter(nameDiv);
        expect(interaction.setHoveredNameSection).toHaveBeenCalledWith(true);
        fireEvent.mouseLeave(nameDiv);
        expect(interaction.setHoveredNameSection).toHaveBeenCalledWith(false);

        // Summary hover
        const summaryImproveBtn = screen.getByTitle('AI Rewrite Summary');
        fireEvent.mouseEnter(summaryImproveBtn);
        expect(interaction.setIsSummaryImproveHovered).toHaveBeenCalledWith(true);
        fireEvent.mouseLeave(summaryImproveBtn);
        expect(interaction.setIsSummaryImproveHovered).toHaveBeenCalledWith(false);
        fireEvent.mouseDown(summaryImproveBtn); // line 351

        // Summary hover stats pill
        const summaryContainer = container.querySelector('.summary-meta-field') as HTMLElement;
        fireEvent.mouseEnter(summaryContainer);
        expect(interaction.setHoveredSummary).toHaveBeenCalledWith(true);
        fireEvent.mouseLeave(summaryContainer);
        expect(interaction.setHoveredSummary).toHaveBeenCalledWith(false);

        // Summary focus/blur
        const summaryInput = screen.getByPlaceholderText('Brief professional profile summary emphasizing key skills...');
        fireEvent.focus(summaryInput);
        expect(interaction.setFocusedSummary).toHaveBeenCalledWith(true);
        fireEvent.blur(summaryInput);
        expect(interaction.setFocusedSummary).toHaveBeenCalledWith(false);

        // Summary rewrite
        defaultProps.data.summaryRewriteSuggestion = { suggestedText: 'Better text', originalText: 'Summary text', isStreaming: false, isQueued: false, reason: 'Good' };
        rerender(<ResumeDocumentEditor {...defaultProps} />);
        
        const summaryRewriteCalls = (handlers.renderRewriteActionButtons as any).mock.calls;
        const summaryLastCall = summaryRewriteCalls[summaryRewriteCalls.length - 1][0];
        
        summaryLastCall.onAccept();
        expect(handlers.acceptSummaryRewriteSuggestion).toHaveBeenCalled();
        
        summaryLastCall.onReject();
        expect(handlers.rejectSummaryRewriteSuggestion).toHaveBeenCalled();
        
        summaryLastCall.onAcceptHover();
        expect(interaction.setRewriteActionHover).toHaveBeenCalledWith({ target: "summary", action: "accept" });
        
        summaryLastCall.onRejectHover();
        expect(interaction.setRewriteActionHover).toHaveBeenCalledWith({ target: "summary", action: "reject" });
        
        summaryLastCall.onClearHover();
        expect(interaction.setRewriteActionHover).toHaveBeenCalledWith(null);
    });

    it('handles contact field interactions', () => {
        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        
        // Hover and focus the email input
        const emailInput = screen.getByPlaceholderText('Email');
        fireEvent.focus(emailInput);
        expect(interaction.setFocusedContactField).toHaveBeenCalledWith('email');
        fireEvent.blur(emailInput);
        expect(interaction.setFocusedContactField).toHaveBeenCalled();
        expect(handlers.removeStandardContactField).not.toHaveBeenCalled();

        // Simulate hover on the input's parent
        const contactFieldDiv = emailInput.closest('div[class*="contact-meta-field"]')!;
        fireEvent.mouseEnter(contactFieldDiv);
        fireEvent.mouseLeave(contactFieldDiv);

        expect(container.querySelector('button[title="Delete"]')).toBeNull();

        // Click Add custom link
        const addCustomBtn = container.querySelector('button[title="Add custom link"]') as HTMLButtonElement;
        fireEvent.mouseDown(addCustomBtn);
        fireEvent.click(addCustomBtn);
        expect(handlers.addCustomContactField).toHaveBeenCalled();
    });

    it('handles interactions when fields are open', () => {
        const props = { ...defaultProps, interaction: { ...defaultProps.interaction, hoveredContactField: 'email', focusedContactField: 'email' } };
        const { container } = render(<ResumeDocumentEditor {...props} />);

        expect(container.querySelector('button[title="Delete"]')).toBeNull();

        // Test the functional updates by extracting the mock call arguments
        const contactFieldDiv = container.querySelector('div[class*="contact-meta-field"]')!;
        fireEvent.mouseLeave(contactFieldDiv);
        const hoverEndCall = (props.interaction.setHoveredContactField as any).mock.lastCall[0];
        if (typeof hoverEndCall === 'function') {
            expect(hoverEndCall('email')).toBe(null);
            expect(hoverEndCall('other')).toBe('other');
        }

        const emailInput = screen.getByPlaceholderText('Email');
        fireEvent.blur(emailInput);
        const blurCall = (props.interaction.setFocusedContactField as any).mock.lastCall[0];
        if (typeof blurCall === 'function') {
            expect(blurCall('email')).toBe(null);
        }
    });

    it('handles interactions when summary and experience are open', () => {
        defaultProps.data.resumeData.experience = [
            { id: 'exp1', jobTitle: '', company: '', startDate: '', endDate: '', location: '', bullets: [] }
        ];
        const props = { 
            ...defaultProps, 
            interaction: { ...defaultProps.interaction, hoveredSummary: true, focusedSummary: true, isExperienceSectionActive: true, hoveredJobId: 'exp1' } 
        };
        const { container } = render(<ResumeDocumentEditor {...props} />);

        // Test summary functional updates
        const summaryDiv = container.querySelector('div[class*="summary-meta-field"]')!;
        fireEvent.mouseLeave(summaryDiv);
        const hoverEndCall = (props.interaction.setHoveredSummary as any).mock.lastCall[0];
        if (typeof hoverEndCall === 'function') {
            expect(hoverEndCall(true)).toBe(false);
        }

        // Experience field focus/blur
        const jobTitleInput = screen.getByTestId('overlay-input-experience.0.jobTitle');
        fireEvent.blur(jobTitleInput);
    });
});
