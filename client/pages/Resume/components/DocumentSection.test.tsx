import { render, fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import type { DocumentSectionId } from '../types';
import { DocumentSection, ShelfMinusIcon, ShelfPlusIcon } from './DocumentSection';

const SectionBoundaryFixture = () => {
    const [activeSection, setActiveSection] = useState<DocumentSectionId | null>(null);

    return (
        <>
            <DocumentSection
                id="experience"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
            >
                <button type="button">Add experience</button>
            </DocumentSection>
            <DocumentSection
                id="education"
                activeSection={activeSection}
                setActiveSection={setActiveSection}
            >
                Education
            </DocumentSection>
        </>
    );
};

describe('DocumentSection', () => {
    it('renders and handles hover events', () => {
        const setActiveSection = vi.fn();
        const { container } = render(
            <DocumentSection
                id="contact"
                activeSection={null}
                setActiveSection={setActiveSection}
                showGapPreview={true}
                gapPreviewHeight={10}
                title="Contact Section"
            >
                <div>Content</div>
            </DocumentSection>
        );

        const section = container.querySelector('section');
        expect(section).toBeTruthy();
        expect(container.querySelector('.document-hover-section-hit-pad-top')).toBeTruthy();
        expect(container.querySelector('.document-hover-section-hit-pad-bottom')).toBeTruthy();

        if (section) {
            fireEvent.mouseEnter(section);
            expect(setActiveSection).toHaveBeenCalledWith("contact");
            
            setActiveSection.mockImplementation((cb) => {
                const res = cb("contact");
                expect(res).toBeNull();
            });
            fireEvent.mouseLeave(section);
            
            setActiveSection.mockImplementation((cb) => {
                const res = cb("other");
                expect(res).toBe("other");
            });
            fireEvent.mouseLeave(section);
        }
    });

    it("keeps a control inside its owning section active while the control is hovered", () => {
        render(<SectionBoundaryFixture />);

        const experienceSection = screen.getByText("Add experience").closest("section");
        const addExperienceButton = screen.getByRole("button", { name: "Add experience" });

        fireEvent.mouseEnter(experienceSection!);
        expect(experienceSection).toHaveAttribute("data-active", "true");

        fireEvent.mouseEnter(addExperienceButton);
        expect(experienceSection).toHaveAttribute("data-active", "true");
    });

    it('renders ShelfMinusIcon', () => {
        const { container } = render(<ShelfMinusIcon />);
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders ShelfPlusIcon', () => {
        const { container } = render(<ShelfPlusIcon />);
        expect(container.querySelector('svg')).toBeTruthy();
    });
});
