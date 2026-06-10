import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OverlayInput } from './OverlayInput';
import React from 'react';

vi.mock('framer-motion', () => {
    const React = require('react');
    return {
        motion: {
            div: React.forwardRef(({ onHoverStart, onHoverEnd, ...props }: any, ref: any) => (
                <div ref={ref} onMouseEnter={onHoverStart} onMouseLeave={onHoverEnd} {...props} />
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

    it('shows text stats', () => {
        const { container } = render(<OverlayInput {...defaultProps} hoveredField="test.path" showTextStats={true} value="hello world" />);
        expect(container.textContent).toContain('11 chars • 2 words');
    });

    it('renders auto resize textarea', () => {
        const { container } = render(<OverlayInput {...defaultProps} isAutoResize={true} />);
        expect(container.querySelector('textarea')).toBeTruthy();
    });
});
