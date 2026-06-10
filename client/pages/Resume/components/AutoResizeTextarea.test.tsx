import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import React from 'react';

describe('AutoResizeTextarea', () => {
    it('renders and adjusts height on mount', () => {
        const { container } = render(<AutoResizeTextarea value="test" onChange={vi.fn()} />);
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        expect(textarea).toBeTruthy();
        expect(textarea.value).toBe('test');
        // Because JSDOM doesn't actually layout, scrollHeight is usually 0,
        // height becomes "2px" based on fallback logic in adjustHeight.
        expect(textarea.style.height).toBe('2px');
    });

    it('handles ref correctly as a function', () => {
        const refFn = vi.fn();
        const { container } = render(<AutoResizeTextarea value="test" onChange={vi.fn()} ref={refFn} />);
        expect(refFn).toHaveBeenCalledWith(container.querySelector('textarea'));
    });

    it('handles ref correctly as an object', () => {
        const refObj = React.createRef<HTMLTextAreaElement>();
        const { container } = render(<AutoResizeTextarea value="test" onChange={vi.fn()} ref={refObj} />);
        expect(refObj.current).toBe(container.querySelector('textarea'));
    });

    it('adjusts height on input, focus, and mouse enter', () => {
        const { container } = render(<AutoResizeTextarea value="test" onChange={vi.fn()} onInput={vi.fn()} onFocus={vi.fn()} onMouseEnter={vi.fn()} />);
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        
        // Mock properties to simulate layout
        Object.defineProperty(textarea, 'scrollHeight', { value: 100, configurable: true });
        Object.defineProperty(textarea, 'offsetHeight', { value: 50, configurable: true });
        Object.defineProperty(textarea, 'clientHeight', { value: 40, configurable: true }); // Border 10px

        fireEvent.input(textarea, { target: { value: 'new value' } });
        // Expected height = scrollHeight (100) + border (10) = 110px
        expect(textarea.style.height).toBe('110px');

        fireEvent.focus(textarea);
        expect(textarea.style.height).toBe('110px');

        fireEvent.mouseEnter(textarea);
        expect(textarea.style.height).toBe('110px');
    });

    it('cleans up resize event listener on unmount', () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = render(<AutoResizeTextarea value="test" onChange={vi.fn()} />);
        
        expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        
        unmount();
        
        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));

        addEventListenerSpy.mockRestore();
        removeEventListenerSpy.mockRestore();
    });

    it('calls handleResize when window is resized', () => {
        const { container } = render(<AutoResizeTextarea value="test" onChange={vi.fn()} />);
        const textarea = container.querySelector('textarea') as HTMLTextAreaElement;
        
        // Mock properties
        Object.defineProperty(textarea, 'scrollHeight', { value: 200, configurable: true });
        
        // Dispatch resize event
        fireEvent(window, new Event('resize'));
        
        // Should recalculate and set new height
        expect(textarea.style.height).toBe('202px'); // scrollHeight(200) + default fallback border(2)
    });
});
