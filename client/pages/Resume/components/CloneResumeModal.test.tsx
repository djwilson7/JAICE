import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloneResumeModal } from './CloneResumeModal';

vi.mock('@/global-components/Modal', () => ({
    Modal: ({ children, onClose, primaryAction, secondaryAction }: any) => (
        <div data-testid="modal">
            <button onClick={onClose} data-testid="close">Close</button>
            <button onClick={primaryAction.onClick} data-testid="primary">{primaryAction.label}</button>
            <button onClick={secondaryAction.onClick} data-testid="secondary">{secondaryAction.label}</button>
            {children}
        </div>
    )
}));

describe('CloneResumeModal', () => {
    let setShowCloneModal: any;
    let handleCreateResume: any;
    let setDontAskClone: any;

    beforeEach(() => {
        setShowCloneModal = vi.fn();
        handleCreateResume = vi.fn();
        setDontAskClone = vi.fn();
        localStorage.clear();
    });

    it('renders without crashing', () => {
        const { container } = render(
            <CloneResumeModal 
                isLightMode={true} 
                dontAskClone={false} 
                setDontAskClone={setDontAskClone} 
                setShowCloneModal={setShowCloneModal} 
                handleCreateResume={handleCreateResume} 
                headerActionButtonClass="" 
                headerActionIconClass="" 
            />
        );
        expect(container).toBeTruthy();
    });

    it('handles close', () => {
        render(
            <CloneResumeModal 
                isLightMode={false} 
                dontAskClone={false} 
                setDontAskClone={setDontAskClone} 
                setShowCloneModal={setShowCloneModal} 
                handleCreateResume={handleCreateResume} 
                headerActionButtonClass="" 
                headerActionIconClass="" 
            />
        );
        fireEvent.click(screen.getByTestId('close'));
        expect(setShowCloneModal).toHaveBeenCalledWith(false);
    });

    it('handles copy action without dontAskClone', () => {
        render(
            <CloneResumeModal 
                isLightMode={true} 
                dontAskClone={false} 
                setDontAskClone={setDontAskClone} 
                setShowCloneModal={setShowCloneModal} 
                handleCreateResume={handleCreateResume} 
                headerActionButtonClass="" 
                headerActionIconClass="" 
            />
        );
        fireEvent.click(screen.getByTestId('secondary'));
        expect(handleCreateResume).toHaveBeenCalledWith(true, false);
        expect(localStorage.getItem("resume_clone_preference")).toBeNull();
    });

    it('handles copy action with dontAskClone', () => {
        render(
            <CloneResumeModal 
                isLightMode={true} 
                dontAskClone={true} 
                setDontAskClone={setDontAskClone} 
                setShowCloneModal={setShowCloneModal} 
                handleCreateResume={handleCreateResume} 
                headerActionButtonClass="" 
                headerActionIconClass="" 
            />
        );
        fireEvent.click(screen.getByTestId('secondary'));
        expect(handleCreateResume).toHaveBeenCalledWith(true, false);
        expect(localStorage.getItem("resume_clone_preference")).toBe("clone");
    });

    it('handles start action without dontAskClone', () => {
        render(
            <CloneResumeModal 
                isLightMode={true} 
                dontAskClone={false} 
                setDontAskClone={setDontAskClone} 
                setShowCloneModal={setShowCloneModal} 
                handleCreateResume={handleCreateResume} 
                headerActionButtonClass="" 
                headerActionIconClass="" 
            />
        );
        fireEvent.click(screen.getByTestId('primary'));
        expect(handleCreateResume).toHaveBeenCalledWith(false, false);
        expect(localStorage.getItem("resume_clone_preference")).toBeNull();
    });

    it('handles start action with dontAskClone', () => {
        render(
            <CloneResumeModal 
                isLightMode={true} 
                dontAskClone={true} 
                setDontAskClone={setDontAskClone} 
                setShowCloneModal={setShowCloneModal} 
                handleCreateResume={handleCreateResume} 
                headerActionButtonClass="" 
                headerActionIconClass="" 
            />
        );
        fireEvent.click(screen.getByTestId('primary'));
        expect(handleCreateResume).toHaveBeenCalledWith(false, false);
        expect(localStorage.getItem("resume_clone_preference")).toBe("scratch");
    });

    it('handles dontAskClone toggle', () => {
        render(
            <CloneResumeModal 
                isLightMode={true} 
                dontAskClone={false} 
                setDontAskClone={setDontAskClone} 
                setShowCloneModal={setShowCloneModal} 
                handleCreateResume={handleCreateResume} 
                headerActionButtonClass="" 
                headerActionIconClass="" 
            />
        );
        fireEvent.click(screen.getByRole('checkbox'));
        expect(setDontAskClone).toHaveBeenCalledWith(true);
    });
});
