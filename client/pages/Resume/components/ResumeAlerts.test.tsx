import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResumeAlerts } from './ResumeAlerts';

describe('ResumeAlerts', () => {
    it('renders without crashing when no messages', () => {
        const { container } = render(
            <ResumeAlerts 
                error={null} 
                successMessage={null} 
                setError={vi.fn()} 
                setSuccessMessage={vi.fn()} 
                headerActionButtonClass="btn" 
                headerActionIconClass="icon" 
            />
        );
        expect(container).toBeTruthy();
    });

    it('renders error message and handles dismissal', () => {
        const setError = vi.fn();
        render(
            <ResumeAlerts 
                error="An error occurred" 
                successMessage={null} 
                setError={setError} 
                setSuccessMessage={vi.fn()} 
                headerActionButtonClass="btn" 
                headerActionIconClass="icon" 
            />
        );
        expect(screen.getByText('An error occurred')).toBeDefined();
        
        const button = screen.getByTitle('Dismiss alert');
        fireEvent.click(button);
        expect(setError).toHaveBeenCalledWith(null);
    });

    it('renders success message and handles dismissal', () => {
        const setSuccessMessage = vi.fn();
        render(
            <ResumeAlerts 
                error={null} 
                successMessage="Action successful" 
                setError={vi.fn()} 
                setSuccessMessage={setSuccessMessage} 
                headerActionButtonClass="btn" 
                headerActionIconClass="icon" 
            />
        );
        expect(screen.getByText('Action successful')).toBeDefined();
        
        const button = screen.getByTitle('Dismiss alert');
        fireEvent.click(button);
        expect(setSuccessMessage).toHaveBeenCalledWith(null);
    });
});
