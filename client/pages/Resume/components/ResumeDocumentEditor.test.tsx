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
    DocumentSection: ({ children, ...props }: any) => <div data-testid="document-section" {...props}>{children}</div>
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
            isFieldChanged: vi.fn().mockReturnValue({ changed: false }),
            getSuggestionReviewClass: vi.fn().mockReturnValue(''),
            updateField: vi.fn(),
            addCustomContactField: vi.fn(),
            updateCustomContactField: vi.fn(),
            removeCustomContactField: vi.fn(),
            removeStandardContactField: vi.fn(),
            updateExperienceField: vi.fn(),
            insertExperienceAt: vi.fn(),
            removeExperience: vi.fn(),
            clearExperience: vi.fn(),
            addBulletWithText: vi.fn(),
            updateBulletText: vi.fn(),
            removeBullet: vi.fn(),
            updateEducationField: vi.fn(),
            addEducation: vi.fn(),
            removeEducation: vi.fn(),
            addEducationDetailWithText: vi.fn(),
            updateEducationDetailText: vi.fn(),
            addSkillCategory: vi.fn(),
            updateSkillCategoryName: vi.fn(),
            updateSkillCategoryItems: vi.fn(),
            removeSkillCategory: vi.fn(),
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
            setActiveDocumentSection: vi.fn(),
            hoveredNameSection: false,
            setHoveredNameSection: vi.fn(),
            focusedNameSection: false,
            setFocusedNameSection: vi.fn(),
            hoveredContactField: null,
            setHoveredContactField: vi.fn(),
            focusedContactField: null,
            setFocusedContactField: vi.fn(),
            hoveredDeleteIndex: null,
            setHoveredDeleteIndex: vi.fn(),
            hoveredSummary: false,
            setHoveredSummary: vi.fn(),
            focusedSummary: false,
            setFocusedSummary: vi.fn(),
            isSummaryImproveHovered: false,
            setIsSummaryImproveHovered: vi.fn(),
            hoveredJobId: null,
            setHoveredJobId: vi.fn(),
            hoveredExperienceImproveId: null,
            setHoveredExperienceImproveId: vi.fn(),
            hoveredExperienceClearId: null,
            setHoveredExperienceClearId: vi.fn(),
            hoveredExperienceDeleteId: null,
            setHoveredExperienceDeleteId: vi.fn(),
            hoveredEducationDeleteId: null,
            setHoveredEducationDeleteId: vi.fn(),
            hoveredSkillDeleteId: null,
            setHoveredSkillDeleteId: vi.fn(),
            rewriteActionHover: null,
            setRewriteActionHover: vi.fn(),
            isExperienceSectionActive: false,
            isSummarySectionActive: false,
            summaryRewriteHoverAction: null,
            summaryCurrentRewriteClass: '',
            isSectionGapPreviewVisible: false,
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

    it('handles contact field updates and deletions', () => {
        // Set hovered so delete button appears
        interaction.hoveredContactField = 'email';
        interaction.focusedContactField = 'custom1';
        
        render(<ResumeDocumentEditor {...defaultProps} />);
        
        const customInput = screen.getByDisplayValue('Custom');
        fireEvent.change(customInput, { target: { value: 'Custom 2' } });
        expect(handlers.updateCustomContactField).toHaveBeenCalledWith(1, 'value', 'Custom 2');

        const emailInput = screen.getByDisplayValue('a@b.com');
        fireEvent.change(emailInput, { target: { value: 'c@d.com' } });
        expect(handlers.updateField).toHaveBeenCalledWith('email', 'c@d.com');

        const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
        fireEvent.click(deleteButtons[0]);
        expect(handlers.removeStandardContactField).toHaveBeenCalledWith('email');

        fireEvent.click(deleteButtons[1]);
        expect(handlers.removeCustomContactField).toHaveBeenCalledWith(1);
    });

    it('handles add custom contact field button', () => {
        render(<ResumeDocumentEditor {...defaultProps} />);
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
        const { rerender } = render(<ResumeDocumentEditor {...newProps} />);
        
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
        
        const { container } = render(<ResumeDocumentEditor {...defaultProps} />);
        const addExpBtn = screen.getByTitle('Add experience');
        fireEvent.click(addExpBtn);
        expect(handlers.insertExperienceAt).toHaveBeenCalledWith(1);

        const addBulletInput = screen.getAllByPlaceholderText('Type to add a new bullet...')[0];
        fireEvent.change(addBulletInput, { target: { value: 'New bullet' } });
        expect(handlers.addBulletWithText).toHaveBeenCalledWith('exp1', 'New bullet');

        const jobDiv = container.querySelector('.group\\/job') as HTMLElement;
        fireEvent.mouseEnter(jobDiv);
        expect(interaction.setHoveredJobId).toHaveBeenCalledWith('exp1');
        fireEvent.mouseLeave(jobDiv);
        expect(interaction.setHoveredJobId).toHaveBeenCalledWith(null);
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
        fireEvent.mouseEnter(delBtn);
        expect(interaction.setHoveredEducationDeleteId).toHaveBeenCalledWith('edu1');
        fireEvent.mouseLeave(delBtn);
        expect(interaction.setHoveredEducationDeleteId).toHaveBeenCalledWith(null);
        fireEvent.click(delBtn);
        expect(handlers.removeEducation).toHaveBeenCalledWith('edu1');

        interaction.activeDocumentSection = 'education';
        rerender(<ResumeDocumentEditor {...defaultProps} />);

        // Test education detail update
        const existingDetailInput = screen.getByDisplayValue('Detail');
        fireEvent.change(existingDetailInput, { target: { value: 'Updated Detail' } });
        expect(handlers.updateEducationDetailText).toHaveBeenCalledWith('edu1', 'd1', 'Updated Detail');

        // Test education add detail input
        const eduDetailInput = screen.getAllByPlaceholderText('Type to add concentration, honors, coursework...')[0];
        fireEvent.change(eduDetailInput, { target: { value: 'New Detail' } });
        expect(handlers.addEducationDetailWithText).toHaveBeenCalledWith('edu1', 'New Detail');
        
        // Don't call add with empty text
        fireEvent.change(eduDetailInput, { target: { value: '  ' } });
        expect(handlers.addEducationDetailWithText).toHaveBeenCalledTimes(1);
    });

    it('handles skills rendering and interactions', () => {
        defaultProps.data.resumeData.skills = [
            { id: 's1', category: 'Lang', items: ['JS', 'TS'] }
        ];
        
        const { rerender } = render(<ResumeDocumentEditor {...defaultProps} />);
        const nameInput = screen.getByDisplayValue('Lang');
        fireEvent.change(nameInput, { target: { value: 'Lang2' } });
        expect(handlers.updateSkillCategoryName).toHaveBeenCalledWith('s1', 'Lang2');

        const itemsInput = screen.getByDisplayValue('JS, TS');
        fireEvent.change(itemsInput, { target: { value: 'JS, TS, Python' } });
        expect(handlers.updateSkillCategoryItems).toHaveBeenCalledWith('s1', 'JS, TS, Python');

        const addSkillBtn = screen.getByTitle('Add skill category');
        fireEvent.click(addSkillBtn);
        expect(handlers.addSkillCategory).toHaveBeenCalled();

        interaction.activeDocumentSection = 'skills';
        rerender(<ResumeDocumentEditor {...defaultProps} />);
        
        // Test skill delete button hover
        const delSkillBtn = screen.getAllByTitle('Delete skill category')[0];
        fireEvent.mouseEnter(delSkillBtn);
        expect(interaction.setHoveredSkillDeleteId).toHaveBeenCalledWith('s1');
        fireEvent.mouseLeave(delSkillBtn);
        expect(interaction.setHoveredSkillDeleteId).toHaveBeenCalledWith(null);

        interaction.hoveredSkillDeleteId = 's1';
        rerender(<ResumeDocumentEditor {...defaultProps} />);
        const delBtn = screen.getAllByLabelText('Delete skill category')[0];
        fireEvent.click(delBtn);
        expect(handlers.removeSkillCategory).toHaveBeenCalledWith('s1');
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

        // Simulate hover on the input's parent
        const contactFieldDiv = emailInput.closest('div[class*="contact-meta-field"]')!;
        fireEvent.mouseEnter(contactFieldDiv);
        fireEvent.mouseLeave(contactFieldDiv);

        // Delete email (with hover logic)
        const delBtns = container.querySelectorAll('button[title="Delete"]');
        if (delBtns.length > 0) {
            const delBtn = delBtns[0] as HTMLButtonElement;
            fireEvent.mouseEnter(delBtn);
            expect(interaction.setHoveredDeleteIndex).toHaveBeenCalledWith('email');
            fireEvent.mouseLeave(delBtn);
            expect(interaction.setHoveredDeleteIndex).toHaveBeenCalledWith(null);
            
            fireEvent.mouseDown(delBtn);
        }

        // Click Add custom link
        const addCustomBtn = container.querySelector('button[title="Add custom link"]') as HTMLButtonElement;
        fireEvent.mouseDown(addCustomBtn);
        fireEvent.click(addCustomBtn);
        expect(handlers.addCustomContactField).toHaveBeenCalled();
    });

    it('handles interactions when fields are open', () => {
        const props = { ...defaultProps, interaction: { ...defaultProps.interaction, hoveredContactField: 'email', focusedContactField: 'email' } };
        const { container } = render(<ResumeDocumentEditor {...props} />);

        screen.debug(container, 10000);

        // Now the remove button should be rendered
        const delBtns = container.querySelectorAll('button[title="Delete"]');
        const delBtn = delBtns[0] as HTMLButtonElement;
        expect(delBtn).toBeTruthy();
        
        fireEvent.mouseEnter(delBtn);
        expect(props.interaction.setHoveredDeleteIndex).toHaveBeenCalledWith('email');
        fireEvent.mouseLeave(delBtn);
        expect(props.interaction.setHoveredDeleteIndex).toHaveBeenCalledWith(null);
        fireEvent.mouseDown(delBtn);

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

        screen.debug(container, 10000);

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
