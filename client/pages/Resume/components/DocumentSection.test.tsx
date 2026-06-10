import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DocumentSection, ShelfMinusIcon, ShelfPlusIcon } from './DocumentSection';

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

    it('renders ShelfMinusIcon', () => {
        const { container } = render(<ShelfMinusIcon />);
        expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders ShelfPlusIcon', () => {
        const { container } = render(<ShelfPlusIcon />);
        expect(container.querySelector('svg')).toBeTruthy();
    });
});
