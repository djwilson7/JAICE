import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ResumeSwitcherRail } from './ResumeSwitcherRail';

vi.mock('@/global-components/SearchBar', () => ({
    SearchBar: ({ searchQuery, setSearchQuery }: any) => (
        <input 
            data-testid="search-bar" 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
        />
    )
}));

vi.mock('./ResumeRailDivider', () => ({
    ResumeRailDivider: () => <div data-testid="rail-divider" />
}));

describe('ResumeSwitcherRail', () => {
    const defaultProps: any = {
        isLightMode: true,
        isLeftRailCollapsed: false,
        railShellStyle: {},
        railHeaderRowClass: '',
        railTitleClass: '',
        railTitleStyle: {},
        headerActionButtonClass: '',
        headerActionIconClass: '',
        handleCreateNewClick: vi.fn(),
        searchQuery: '',
        setSearchQuery: vi.fn(),
        resumeSearchFocusSignal: 0,
        loadingList: false,
        filteredResumes: [
            { id: '1', name: 'Resume 1', updated_at: '2024-01-01T00:00:00Z', is_master: true },
            { id: '2', name: 'Resume 2', updated_at: '2024-01-02T00:00:00Z', is_master: false }
        ],
        activeResumeId: '1',
        loadResumeIntoWorkspace: vi.fn(),
        handleDeleteResume: vi.fn()
    };

    it('renders resumes and handles interactions', () => {
        render(<ResumeSwitcherRail {...defaultProps} />);

        // Create new
        const createBtn = screen.getByLabelText('Create a new resume.');
        fireEvent.click(createBtn);
        expect(defaultProps.handleCreateNewClick).toHaveBeenCalled();

        // Search bar
        const searchInput = screen.getByTestId('search-bar');
        fireEvent.change(searchInput, { target: { value: 'test' } });
        expect(defaultProps.setSearchQuery).toHaveBeenCalledWith('test');

        // Resumes list
        expect(screen.getByText('Resume 1')).toBeTruthy();
        expect(screen.getByText('Resume 2')).toBeTruthy();

        // Select resume
        fireEvent.click(screen.getByText('Resume 2'));
        expect(defaultProps.loadResumeIntoWorkspace).toHaveBeenCalledWith(defaultProps.filteredResumes[1]);

        // Delete resume
        const deleteBtns = screen.getAllByTitle('Delete version');
        fireEvent.click(deleteBtns[1]);
        expect(defaultProps.handleDeleteResume).toHaveBeenCalledWith('2', expect.any(Object));
    });

    it('renders empty states', () => {
        const { rerender } = render(<ResumeSwitcherRail {...defaultProps} loadingList={true} />);
        expect(screen.getByText('Loading profiles...')).toBeTruthy();

        rerender(<ResumeSwitcherRail {...defaultProps} loadingList={false} filteredResumes={[]} searchQuery="" />);
        expect(screen.getByText('No saved resumes.')).toBeTruthy();

        rerender(<ResumeSwitcherRail {...defaultProps} loadingList={false} filteredResumes={[]} searchQuery="test" />);
        expect(screen.getByText('No matching versions found.')).toBeTruthy();
    });

    it('renders collapsed rail', () => {
        render(<ResumeSwitcherRail {...defaultProps} isLeftRailCollapsed={true} />);
        // The rail is just hidden visually via classes, but we can verify it renders without crashing
        expect(screen.getByText('Resumes')).toBeTruthy();
    });
});

