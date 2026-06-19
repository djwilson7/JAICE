import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OverlayInput } from './OverlayInput';
import React from 'react';

vi.mock('framer-motion', () => {
    const React = require('react');
    return {
        motion: {
            div: React.forwardRef(({ onHoverStart, onHoverEnd, animate, ...props }: any, ref: any) => (
                <div
                    ref={ref}
                    onMouseEnter={onHoverStart}
                    onMouseLeave={onHoverEnd}
                    data-animate={JSON.stringify(animate)}
                    {...props}
                />
            )),
        },
        AnimatePresence: ({ children }: any) => <>{children}</>,
    };
});

describe('OverlayInput', () => {
    const defaultProps = {
        path: 'test.path',
        label: 'Test Label',
        value: 'test value',
        placeholder: 'Test Placeholder',
        className: 'test-class',
        onChange: vi.fn(),
        hoveredField: null,
        setHoveredField: vi.fn(),
        focusedField: null,
        setFocusedField: vi.fn(),
    };

    it('renders and handles focus', () => {
        render(<OverlayInput {...defaultProps} focusedField="test.path" />);
        const input = screen.getByDisplayValue('test value');
        expect(input).toBeDefined();
        
        fireEvent.focus(input);
        expect(defaultProps.setFocusedField).toHaveBeenCalledWith('test.path');
        
        fireEvent.blur(input);
        expect(defaultProps.setFocusedField).toHaveBeenCalled();
    });

    it('handles typing', () => {
        render(<OverlayInput {...defaultProps} />);
        const input = screen.getByDisplayValue('test value');
        fireEvent.change(input, { target: { value: 'new value' } });
        expect(defaultProps.onChange).toHaveBeenCalledWith('new value');
    });

    it('handles clear button', () => {
        render(<OverlayInput {...defaultProps} focusedField="test.path" hoveredField="test.path" />);
        const clearBtn = screen.getByTitle('Clear field');
        fireEvent.mouseEnter(clearBtn);
        fireEvent.mouseLeave(clearBtn);
        fireEvent.mouseDown(clearBtn);
        fireEvent.click(clearBtn);
        expect(defaultProps.onChange).toHaveBeenCalledWith('');
    });

    it('handles delete button', () => {
        const onDelete = vi.fn();
        render(<OverlayInput {...defaultProps} focusedField="test.path" hoveredField="test.path" onDelete={onDelete} />);
        const delBtn = screen.getByTitle('Delete');
        fireEvent.mouseEnter(delBtn);
        fireEvent.mouseLeave(delBtn);
        fireEvent.mouseDown(delBtn);
        fireEvent.click(delBtn);
        expect(onDelete).toHaveBeenCalled();
    });

    it('renders custom action left', () => {
        const onCustomAction = vi.fn();
        render(<OverlayInput {...defaultProps} focusedField="test.path" onCustomAction={onCustomAction} customActionIcon={<span>icon</span>} customActionPlacement="left" customActionTitle="custom" />);
        const customBtn = screen.getByTitle('custom');
        fireEvent.mouseDown(customBtn);
        fireEvent.click(customBtn);
        expect(onCustomAction).toHaveBeenCalled();
    });

    it('renders custom action right', () => {
        const onCustomAction = vi.fn();
        render(<OverlayInput {...defaultProps} focusedField="test.path" onCustomAction={onCustomAction} customActionIcon={<span>icon</span>} customActionPlacement="right" customActionTitle="custom" />);
        const customBtn = screen.getByTitle('custom');
        fireEvent.click(customBtn);
        expect(onCustomAction).toHaveBeenCalled();
    });

    it('renders custom action tray', () => {
        const onCustomAction = vi.fn();
        render(<OverlayInput {...defaultProps} focusedField="test.path" onCustomAction={onCustomAction} customActionIcon={<span>icon</span>} customActionPlacement="tray" customActionTitle="custom" />);
        const customBtn = screen.getByTitle('custom');
        fireEvent.click(customBtn);
        expect(onCustomAction).toHaveBeenCalled();
    });

    it('handles hover container', () => {
        const setHoveredField = vi.fn();
        const { container } = render(<OverlayInput {...defaultProps} setHoveredField={setHoveredField} />);
        const wrapper = container.firstChild as HTMLElement;
        fireEvent.mouseEnter(wrapper);
        expect(setHoveredField).toHaveBeenCalledWith('test.path');
        
        setHoveredField.mockImplementation((cb) => {
            const res = cb('test.path');
            expect(res).toBeNull();
        });
        fireEvent.mouseLeave(wrapper);
    });

    it('keeps hover animation layout-neutral', () => {
        const { container } = render(
            <OverlayInput
                {...defaultProps}
                hoveredField="test.path"
                onDelete={vi.fn()}
                onCustomAction={vi.fn()}
                customActionIcon={<span>icon</span>}
                customActionPlacement="left"
            />
        );
        const animation = JSON.parse(
            (container.firstChild as HTMLElement).dataset.animate || '{}'
        );

        expect(animation).not.toHaveProperty('paddingTop');
        expect(animation).not.toHaveProperty('paddingRight');
        expect(animation).not.toHaveProperty('paddingBottom');
        expect(animation).not.toHaveProperty('paddingLeft');
        expect(animation).not.toHaveProperty('marginTop');
        expect(animation).not.toHaveProperty('marginRight');
        expect(animation).not.toHaveProperty('marginBottom');
        expect(animation).not.toHaveProperty('marginLeft');
    });

    it('does not render field-level text statistics', () => {
        const { container } = render(<OverlayInput {...defaultProps} hoveredField="test.path" value="hello world" />);
        expect(container.textContent).not.toContain('11 chars');
    });

    it('renders auto resize textarea', () => {
        const { container } = render(<OverlayInput {...defaultProps} isAutoResize={true} />);
        expect(container.querySelector('textarea')).toBeTruthy();
    });
});
