import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResumePrintDocument } from './ResumePrintDocument';

describe('ResumePrintDocument', () => {
    const defaultFormatting: any = {
        pageSize: 'letter',
        paperLayoutFormat: 'standard',
        innerSectionGapFormat: 'standard',
        headerFontSize: 16,
        subHeaderFontSize: 14,
        bodyFontSize: 12,
        pageMarginPt: 36,
        titleFontSize: 24,
    };

    it('renders with full data', () => {
        const resumeData: any = {
            fullName: 'John Doe',
            hiddenContactFields: ['phone'],
            location: 'New York, NY',
            email: 'john@doe.com',
            linkedin: 'linkedin.com/in/johndoe',
            website: 'johndoe.com',
            github: 'github.com/johndoe',
            customContact: [{ value: 'Custom Link' }],
            summary: 'Experienced professional.',
            experience: [
                {
                    id: 'exp1',
                    jobTitle: 'Software Engineer',
                    company: 'Tech Corp',
                    location: 'Remote',
                    startDate: 'Jan 2020',
                    endDate: 'Present',
                    bullets: [{ id: 'b1', text: 'Built things.' }]
                }
            ],
            education: [
                {
                    id: 'edu1',
                    degree: 'B.S. Computer Science',
                    school: 'University',
                    startDate: '2015',
                    endDate: '2019',
                    details: [{ id: 'd1', text: 'Graduated with honors.' }]
                }
            ],
            skills: [
                {
                    id: 'skill1',
                    category: 'Languages',
                    items: ['JavaScript', 'TypeScript']
                }
            ]
        };

        const { container } = render(
            <ResumePrintDocument
                resumeData={resumeData}
                formatting={defaultFormatting}
            />
        );

        expect(container.textContent).toContain('John Doe');
        expect(container.textContent).toContain('New York, NY');
        expect(container.textContent).not.toContain('phone'); // hidden
        expect(container.textContent).toContain('john@doe.com');
        expect(container.textContent).toContain('Custom Link');
        expect(container.textContent).toContain('Experienced professional.');
        expect(container.textContent).toContain('Software Engineer');
        expect(container.textContent).toContain('Tech Corp');
        expect(container.textContent).toContain('Built things.');
        expect(container.textContent).toContain('B.S. Computer Science');
        expect(container.textContent).toContain('Graduated with honors.');
        expect(container.textContent).toContain('Languages');
        expect(container.textContent).toContain('JavaScript, TypeScript');
    });

    it('renders empty data safely', () => {
        const { container } = render(
            <ResumePrintDocument
                resumeData={{}}
                formatting={{...defaultFormatting, pageSize: 'a4', paperLayoutFormat: 'compact'}}
            />
        );

        expect(container.textContent).toContain('Your Name');
    });

    it('renders partial data variations', () => {
        const resumeData: any = {
            experience: [
                {
                    id: 'exp1',
                    jobTitle: '',
                    company: '',
                    bullets: [{ id: 'b1', text: '' }]
                },
                {
                    id: 'exp2',
                    jobTitle: 'Title Only'
                }
            ],
            education: [
                {
                    id: 'edu1',
                    degree: '',
                    school: '',
                    details: [{ id: 'd1', text: '' }]
                },
                {
                    id: 'edu2',
                    degree: 'Degree Only'
                }
            ],
            skills: [
                {
                    id: 'skill1',
                    category: '',
                    items: []
                },
                {
                    id: 'skill2',
                    category: 'Only Category',
                    items: []
                },
                {
                    id: 'skill3',
                    category: '',
                    items: ['Item without category']
                }
            ]
        };

        const { container } = render(
            <ResumePrintDocument
                resumeData={resumeData}
                formatting={defaultFormatting}
            />
        );

        expect(container.textContent).toContain('Title Only');
        expect(container.textContent).toContain('Degree Only');
        expect(container.textContent).toContain('Only Category');
        expect(container.textContent).toContain('Item without category');
    });

    it('renders custom section titles without rendering tag metadata', () => {
        const { container } = render(
            <ResumePrintDocument
                resumeData={{
                    fullName: 'John Doe',
                    summary: 'Summary',
                    sectionTitles: {
                        summary: 'Profile',
                        experience: 'Engineering Experience',
                        education: 'Academic Background',
                        skills: 'Technical Toolkit'
                    },
                    tagLibrary: [{
                        id: 'tag-1',
                        name: 'Backend',
                        slug: 'backend',
                        colorToken: 'tag-purple',
                        createdAt: '2026-01-01T00:00:00.000Z'
                    }],
                    experience: [{
                        id: 'exp-1',
                        jobTitle: 'Engineer',
                        bullets: [{ id: 'bullet-1', text: 'Built systems', tagIds: ['tag-1'] }]
                    }],
                    education: [],
                    skills: []
                }}
                formatting={defaultFormatting}
            />
        );

        expect(container.textContent).toContain('Profile');
        expect(container.textContent).toContain('Engineering Experience');
        expect(container.textContent).not.toContain('Backend');
    });

    it('uses bodyFontSize for body text and subHeaderFontSize for meta text', () => {
        const { container } = render(
            <ResumePrintDocument
                resumeData={{
                    fullName: 'John Doe',
                    summary: 'Body copy',
                    experience: [{
                        id: 'exp-1',
                        jobTitle: 'Meta Role',
                        bullets: [{ id: 'bullet-1', text: 'Body bullet' }]
                    }],
                    education: [],
                    skills: []
                } as any}
                formatting={{
                    ...defaultFormatting,
                    bodyFontSize: 11,
                    subHeaderFontSize: 15
                }}
            />
        );

        const findTextElement = (text: string) => Array.from(container.querySelectorAll<HTMLElement>('*'))
            .find((element) => element.textContent === text);

        expect(container.firstChild).toHaveStyle({
            '--resume-body-font-size': '14.67px',
            '--resume-subheader-font-size': '20px'
        });
        expect(container.querySelector('p')).toHaveClass('resume-document__body');
        expect(container.querySelector('article > div')).toHaveClass('resume-document__meta-row');
        expect(findTextElement('Body bullet')).toHaveClass('resume-document__body');
    });

    it('uses the body token for the contact strip under the name', () => {
        const { container } = render(
            <ResumePrintDocument
                resumeData={{
                    fullName: 'John Doe',
                    email: 'john@example.com',
                    experience: [],
                    education: [],
                    skills: []
                } as any}
                formatting={{
                    ...defaultFormatting,
                    bodyFontSize: 10,
                    subHeaderFontSize: 18
                }}
            />
        );

        expect(container.firstChild).toHaveStyle({ '--resume-body-font-size': '13.33px' });
        expect(container.querySelector('section > div')).toHaveClass('resume-document__contact-strip');
    });
});
