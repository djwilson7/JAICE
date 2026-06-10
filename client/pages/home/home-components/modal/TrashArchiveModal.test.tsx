import { render, screen, act, fireEvent } from '@testing-library/react';
import TrashArchiveModal from './TrashArchiveModal';
import { vi } from 'vitest';
import { useJobCard } from '@/pages/home/hooks/useJobCard';
import { useDrag } from '@/pages/home/hooks/useDrag';

vi.mock('@/pages/home/hooks/useJobCard', () => ({
  useJobCard: vi.fn(),
}));

vi.mock('@/pages/home/hooks/useDrag', () => ({
  useDrag: vi.fn(),
}));

vi.mock('@/pages/home/hooks/useIsMultiSelecting', () => ({
  useIsMultiSelecting: () => ({ isMultiSelecting: false, setIsMultiSelecting: vi.fn() }),
}));

vi.mock('@/pages/home/hooks/useSelectedJobs', () => ({
  useSelectedJobs: () => ({ selectedJobs: [], setSelectedJobs: vi.fn(), toggleJobSelection: vi.fn() }),
}));

describe('TrashArchiveModal', () => {
  const onCloseMock = vi.fn();
  const onActionMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useJobCard as any).mockReturnValue({
        isHighlighted: false,
        setIsHighlighted: vi.fn(),
        localJobRef: { current: null },
    });
    (useDrag as any).mockReturnValue({
        dragContext: {},
    });
  });

  it('renders trash empty state', () => {
    render(
      <TrashArchiveModal isOpen={true} onClose={onCloseMock} items={[]} mode="trash" onAction={onActionMock} />
    );
    expect(screen.getByText('Trash Bin')).toBeInTheDocument();
    expect(screen.getByText('Trash is empty')).toBeInTheDocument();
  });

  it('renders archive empty state', () => {
    render(
      <TrashArchiveModal isOpen={true} onClose={onCloseMock} items={[]} mode="archive" onAction={onActionMock} />
    );
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Archive is empty')).toBeInTheDocument();
  });

  it('renders skeleton loader when loading', () => {
    render(
      <TrashArchiveModal isOpen={true} isLoading={true} onClose={onCloseMock} items={[]} />
    );
    expect(screen.getByRole('status', { name: 'Loading jobs' })).toBeInTheDocument();
  });

  it('renders trash items and handles restore', async () => {
    const items: any[] = [{ id: '1', title: 'Job 1', companyName: 'Corp', reviewNeeded: false }];
    render(
      <TrashArchiveModal isOpen={true} onClose={onCloseMock} items={items} mode="trash" onAction={onActionMock} />
    );
    expect(screen.getByText('Job 1')).toBeInTheDocument();
    
    // Test hover state to reveal buttons
    const card = screen.getByText('Job 1').closest('.job-card');
    fireEvent.mouseEnter(card!);

    const restoreBtn = screen.getByRole('button', { name: 'Restore' });
    await act(async () => {
      fireEvent.click(restoreBtn);
    });

    expect(onActionMock).toHaveBeenCalledWith('undelete', ['1']);
  });

  it('handles permanent delete confirmation', async () => {
    const items: any[] = [{ id: '1', title: 'Job 1', companyName: 'Corp', reviewNeeded: false }];
    render(
      <TrashArchiveModal isOpen={true} onClose={onCloseMock} items={items} mode="trash" onAction={onActionMock} />
    );
    
    const card = screen.getByText('Job 1').closest('.job-card');
    fireEvent.mouseEnter(card!);

    const permDelBtn = screen.getByRole('button', { name: 'Delete permanently' });
    fireEvent.click(permDelBtn);

    // Confirm Modal shows
    expect(screen.getByText('Confirm Permanent Deletion')).toBeInTheDocument();
    const confirmBtns = screen.getAllByRole('button', { name: 'Delete' });
    const confirmBtn = confirmBtns.find(b => b.textContent === 'Delete');
    
    await act(async () => {
      fireEvent.click(confirmBtn as HTMLElement);
    });

    expect(onActionMock).toHaveBeenCalledWith('delete_permanently', ['1']);
  });

  it('renders archive items and handles delete', async () => {
    const items: any[] = [{ id: '2', title: 'Job 2', companyName: 'Corp', reviewNeeded: false }];
    render(
      <TrashArchiveModal isOpen={true} onClose={onCloseMock} items={items} mode="archive" onAction={onActionMock} />
    );
    expect(screen.getByText('Job 2')).toBeInTheDocument();
    
    const card = screen.getByText('Job 2').closest('.job-card');
    fireEvent.mouseEnter(card!);

    const delBtn = screen.getByRole('button', { name: 'Delete' });
    await act(async () => {
      fireEvent.click(delBtn);
    });

    expect(onActionMock).toHaveBeenCalledWith('delete', ['2']);
  });
});
