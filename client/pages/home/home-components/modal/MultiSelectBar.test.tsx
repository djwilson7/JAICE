import { render, screen, act, fireEvent } from '@testing-library/react';
import { MultiSelectBar } from './MultiSelectBar';
import { useIsMultiSelecting } from '../../hooks/useIsMultiSelecting';
import { useSelectedJobs } from '../../hooks/useSelectedJobs';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { vi } from 'vitest';
import { api } from '@/global-services/api';

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

    expect(api).toHaveBeenCalledWith('/api/jobs/set-archive', expect.any(Object));
    expect(pushUndoMock).toHaveBeenCalled();
    expect(setSelectedJobsMock).toHaveBeenCalledWith([]);
  });

  it('handles review action', async () => {
    render(<MultiSelectBar setIsHighlighted={setIsHighlightedMock} />);
    const reviewBtn = screen.getByRole('button', { name: /Mark As Reviewed/i });
    
    await act(async () => {
      fireEvent.click(reviewBtn);
    });

    expect(api).toHaveBeenCalledWith('/api/jobs/set-review-needed', expect.any(Object));
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

    expect(api).toHaveBeenCalledWith('/api/jobs/set-delete', expect.any(Object));
    expect(pushUndoMock).toHaveBeenCalled();
    expect(setSelectedJobsMock).toHaveBeenCalledWith([]);
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
