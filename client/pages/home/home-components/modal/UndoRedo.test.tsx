import { render, screen, act, fireEvent } from '@testing-library/react';
import { UndoRedo } from './UndoRedo';
import { useUndoRedo } from '@/pages/home/hooks/useUndoRedo';
import { useDrag } from '@/pages/home/hooks/useDrag';
import { vi } from 'vitest';
import { api } from '@/global-services/api';

vi.mock('@/pages/home/hooks/useUndoRedo', () => ({
  useUndoRedo: vi.fn(),
}));

vi.mock('@/pages/home/hooks/useDrag', () => ({
  useDrag: vi.fn(),
}));

vi.mock('@/global-services/api', () => ({
  api: vi.fn().mockResolvedValue({ status: "success" }),
}));

vi.mock('@/pages/home/utils/jobLocalChangeEvent', () => ({
  dispatchJobLocalChange: vi.fn(),
}));

describe('UndoRedo', () => {
  const undoMock = vi.fn();
  const redoMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useDrag as any).mockReturnValue({ isDragging: false });
    (useUndoRedo as any).mockReturnValue({
      undoCount: 1,
      redoCount: 1,
      undo: undoMock,
      redo: redoMock,
    });
  });

  it('renders correctly', () => {
    render(<UndoRedo />);
    expect(screen.getByRole('button', { name: /Undo last action/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Redo last action/i })).toBeInTheDocument();
  });

  it('disables buttons when dragging', () => {
    (useDrag as any).mockReturnValue({ isDragging: true });
    render(<UndoRedo />);
    expect(screen.getByRole('button', { name: /Undo last action/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Redo last action/i })).toBeDisabled();
  });

  it('disables buttons when counts are zero', () => {
    (useUndoRedo as any).mockReturnValue({
      undoCount: 0,
      redoCount: 0,
      undo: undoMock,
      redo: redoMock,
    });
    render(<UndoRedo />);
    expect(screen.getByRole('button', { name: /Undo last action/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Redo last action/i })).toBeDisabled();
  });

  it('handles undo correctly', async () => {
    const fakeSnapshot = {
        before: [{ id: '1', title: 'A' }],
        after: [{ id: '1', title: 'B' }]
    };
    undoMock.mockReturnValue(fakeSnapshot);

    render(<UndoRedo />);
    const undoBtn = screen.getByRole('button', { name: /Undo last action/i });
    
    await act(async () => {
      fireEvent.click(undoBtn);
    });

    expect(undoMock).toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith('/api/jobs/snapshot-update', expect.any(Object));
  });

  it('handles redo correctly', async () => {
    const fakeSnapshot = {
        before: [{ id: '1', title: 'A' }],
        after: [{ id: '1', title: 'B' }]
    };
    redoMock.mockReturnValue(fakeSnapshot);

    render(<UndoRedo />);
    const redoBtn = screen.getByRole('button', { name: /Redo last action/i });
    
    await act(async () => {
      fireEvent.click(redoBtn);
    });

    expect(redoMock).toHaveBeenCalled();
    expect(api).toHaveBeenCalledWith('/api/jobs/snapshot-update', expect.any(Object));
  });
});
