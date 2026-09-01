import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { MultiSelectBar } from './MultiSelectBar';
import { useIsMultiSelecting } from '../../hooks/useIsMultiSelecting';
import { useSelectedJobs } from '../../hooks/useSelectedJobs';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { vi } from 'vitest';
import { api } from '@/global-services/api';
import { GuidedTourSessionContext } from '@/app/layouts/guidedTourSessionContext';
import { dispatchJobLocalChange } from '@/pages/home/utils/jobLocalChangeEvent';

vi.mock('@/global-services/projectMode', () => ({ IS_DEMO_MODE: true }));

vi.mock('../../hooks/useIsMultiSelecting', () => ({
  useIsMultiSelecting: vi.fn(),
}));

vi.mock('../../hooks/useSelectedJobs', () => ({
  useSelectedJobs: vi.fn(),
}));

vi.mock('../../hooks/useUndoRedo', () => ({
  useUndoRedo: vi.fn(),
}));

vi.mock('@/global-services/api', () => ({
  api: vi.fn().mockResolvedValue({ status: "success" }),
}));
vi.mock('@/pages/home/utils/jobLocalChangeEvent', () => ({
  dispatchJobLocalChange: vi.fn(),
}));

describe('MultiSelectBar', () => {
  const setIsMultiSelectingMock = vi.fn();
  const setSelectedJobsMock = vi.fn();
  const pushUndoMock = vi.fn();
  const setIsHighlightedMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIsMultiSelecting as any).mockReturnValue({
      isMultiSelecting: true,
      setIsMultiSelecting: setIsMultiSelectingMock,
    });
    (useSelectedJobs as any).mockReturnValue({
      selectedJobs: [{ id: '1', title: 'A', reviewNeeded: true }],
      setSelectedJobs: setSelectedJobsMock,
    });
    (useUndoRedo as any).mockReturnValue({
      pushUndo: pushUndoMock,
    });
  });

  it('renders correctly when multi-selecting', () => {
    render(<MultiSelectBar setIsHighlighted={setIsHighlightedMock} />);
    expect(screen.getByText(/1 email selected/i)).toBeInTheDocument();
  });

  it('returns null if not multi-selecting', () => {
    (useIsMultiSelecting as any).mockReturnValue({ isMultiSelecting: false });
    const { container } = render(<MultiSelectBar setIsHighlighted={setIsHighlightedMock} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('handles archive action', async () => {
    render(<MultiSelectBar setIsHighlighted={setIsHighlightedMock} />);
    const archiveBtn = screen.getByRole('button', { name: /Archive/i });
    
    await act(async () => {
      fireEvent.click(archiveBtn);
    });

    expect(api).not.toHaveBeenCalled();
    expect(dispatchJobLocalChange).toHaveBeenCalled();
    expect(pushUndoMock).toHaveBeenCalled();
    expect(setSelectedJobsMock).toHaveBeenCalledWith([]);
  });

  it('handles review action', async () => {
    render(<MultiSelectBar setIsHighlighted={setIsHighlightedMock} />);
    const reviewBtn = screen.getByRole('button', { name: /Mark As Reviewed/i });
    
    await act(async () => {
      fireEvent.click(reviewBtn);
    });

    expect(api).not.toHaveBeenCalled();
    expect(dispatchJobLocalChange).toHaveBeenCalled();
    expect(pushUndoMock).toHaveBeenCalled();
    expect(setSelectedJobsMock).toHaveBeenCalledWith([]);
  });

  it('handles delete action via modal', async () => {
    render(<MultiSelectBar setIsHighlighted={setIsHighlightedMock} />);
    const deleteBtn = screen.getByRole('button', { name: /^Delete$/i });
    
    fireEvent.click(deleteBtn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const confirmBtn = screen.getAllByRole('button', { name: /Delete/i }).find(b => b.textContent === 'Delete');
    
    await act(async () => {
      fireEvent.click(confirmBtn as HTMLElement);
    });

    expect(api).not.toHaveBeenCalled();
    expect(dispatchJobLocalChange).toHaveBeenCalled();
    expect(pushUndoMock).toHaveBeenCalled();
    expect(setSelectedJobsMock).toHaveBeenCalledWith([]);
  });

  it('presents the tour confirmation without executing a persistence action', async () => {
    const recordDeletedJobIds = vi.fn();
    render(
      <GuidedTourSessionContext.Provider
        value={{
          demoDataAvailable: true,
          demoDataState: 'sorted',
          demoDataRevision: 10,
          homeInteractionState: 'delete-confirmation',
          deletedJobIds: [],
          recordDeletedJobIds,
          demoJobs: [],
          setDemoJobs: vi.fn(),
          removeDemoJobs: vi.fn(),
          emails: [],
        }}
      >
        <MultiSelectBar setIsHighlighted={setIsHighlightedMock} />
      </GuidedTourSessionContext.Provider>
    );

    const dialog = screen.getByRole('dialog', { name: 'Confirm Deletion' });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    });

    expect(api).not.toHaveBeenCalled();
    expect(recordDeletedJobIds).toHaveBeenCalledWith(['1']);
    expect(dialog).not.toBeInTheDocument();
  });

  it('locks every bulk action while the tour is collecting three selections', () => {
    render(
      <GuidedTourSessionContext.Provider
        value={{
          demoDataAvailable: true,
          demoDataState: 'sorted',
          demoDataRevision: 10,
          homeInteractionState: 'selecting-cards',
          deletedJobIds: [],
          recordDeletedJobIds: vi.fn(),
          demoJobs: [],
          setDemoJobs: vi.fn(),
          removeDemoJobs: vi.fn(),
          emails: [],
        }}
      >
        <MultiSelectBar setIsHighlighted={setIsHighlightedMock} />
      </GuidedTourSessionContext.Provider>
    );

    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark As Reviewed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
  });

  it('enables only Delete on the tour bulk-action step', () => {
    render(
      <GuidedTourSessionContext.Provider
        value={{
          demoDataAvailable: true,
          demoDataState: 'sorted',
          demoDataRevision: 11,
          homeInteractionState: 'bulk-selected',
          deletedJobIds: [],
          recordDeletedJobIds: vi.fn(),
          demoJobs: [],
          setDemoJobs: vi.fn(),
          removeDemoJobs: vi.fn(),
          emails: [],
        }}
      >
        <MultiSelectBar setIsHighlighted={setIsHighlightedMock} />
      </GuidedTourSessionContext.Provider>
    );

    expect(screen.getByRole('button', { name: 'Archive' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Mark As Reviewed' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
  });

  it('handles hover states', () => {
    render(<MultiSelectBar setIsHighlighted={setIsHighlightedMock} />);
    const archiveBtn = screen.getByRole('button', { name: /Archive/i });
    
    act(() => {
        fireEvent.mouseEnter(archiveBtn.parentElement!);
    });
    expect(screen.getByText(/Archive 1 job\?/i)).toBeInTheDocument();

    act(() => {
        fireEvent.mouseLeave(archiveBtn.parentElement!);
    });
  });
});
