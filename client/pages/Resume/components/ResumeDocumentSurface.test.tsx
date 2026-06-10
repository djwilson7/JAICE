import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ResumeDocumentSurface } from './ResumeDocumentSurface';
import { RESUME_DOCUMENT_TYPOGRAPHY } from '../resumeTypography';

describe('ResumeDocumentSurface', () => {
    const defaultFormatting: any = {
        pageSize: 'letter',
        paperLayoutFormat: 'standard',
        headerFontSize: 16,
        bodyFontSize: 12,
        pageMarginPt: 36,
        titleFontSize: 24,
    };

    it('renders with full data in print mode', () => {
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
            <ResumeDocumentSurface
                resumeData={resumeData}
                formatting={defaultFormatting}
                mode="print"
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

    it('renders empty data safely in edit mode', () => {
        const { container } = render(
            <ResumeDocumentSurface
                resumeData={{}}
                formatting={{...defaultFormatting, pageSize: 'a4', paperLayoutFormat: 'compact'}}
                mode="edit"
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
            <ResumeDocumentSurface
                resumeData={resumeData}
                formatting={defaultFormatting}
                mode="edit"
            />
        );

        expect(container.textContent).toContain('Title Only');
        expect(container.textContent).toContain('Degree Only');
        expect(container.textContent).toContain('Only Category');
        expect(container.textContent).toContain('Item without category');
    });
});
