import { render, screen, act, fireEvent } from '@testing-library/react';
import NewApplication from './ApplicationModal';
import { vi } from 'vitest';
import { api } from '@/global-services/api';

vi.mock('@/global-services/api', () => ({
  api: vi.fn().mockResolvedValue({ status: "success" }),
}));

describe('ApplicationModal', () => {
  const setIsOpenMock = vi.fn();
  const onSaveMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <NewApplication isOpen={false} setIsOpen={setIsOpenMock} payload={null} onSave={onSaveMock} />
    );
    expect(screen.queryByText('New Application')).not.toBeInTheDocument();
  });

  it('renders correctly for new application', () => {
    render(
      <NewApplication isOpen={true} setIsOpen={setIsOpenMock} payload={null} onSave={onSaveMock} />
    );
    expect(screen.getByText('New Application')).toBeInTheDocument();
  });

  it('renders correctly for editing string payload', () => {
    render(
      <NewApplication isOpen={true} setIsOpen={setIsOpenMock} payload="offer" onSave={onSaveMock} />
    );
    expect(screen.getByText('Offer')).toBeInTheDocument();
  });

  it('renders correctly for editing job card', () => {
    const jobCard = { id: '123', title: 'Software Engineer', applicationStage: 'Interview' };
    render(
      <NewApplication isOpen={true} setIsOpen={setIsOpenMock} payload={jobCard as any} onSave={onSaveMock} />
    );
    expect(screen.getByText('Edit Application')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Interview')).toBeInTheDocument();
  });

  it('handles save for new application', async () => {
    render(
      <NewApplication isOpen={true} setIsOpen={setIsOpenMock} payload={null} onSave={onSaveMock} />
    );
    
    const titleInput = screen.getByLabelText('Job title');
    fireEvent.change(titleInput, { target: { value: 'Frontend Developer' } });

    await act(async () => {
      fireEvent.submit(titleInput.closest('form')!);
    });

    expect(api).toHaveBeenCalledWith('/api/jobs/create', expect.any(Object));
    expect(setIsOpenMock).toHaveBeenCalledWith(false);
    expect(onSaveMock).toHaveBeenCalled();
  });

  it('handles save for editing application', async () => {
    const jobCard = { id: '123', title: 'Software Engineer', applicationStage: 'Interview' };
    render(
      <NewApplication isOpen={true} setIsOpen={setIsOpenMock} payload={jobCard as any} onSave={onSaveMock} />
    );
    
    const titleInput = screen.getByLabelText('Job title');
    fireEvent.change(titleInput, { target: { value: 'Senior Backend' } });

    await act(async () => {
      fireEvent.submit(titleInput.closest('form')!);
    });

    expect(api).toHaveBeenCalledWith('/api/jobs/update', expect.any(Object));
    expect(setIsOpenMock).toHaveBeenCalledWith(false);
    expect(onSaveMock).toHaveBeenCalled();
  });

  it('handles stage picker', () => {
    render(
      <NewApplication isOpen={true} setIsOpen={setIsOpenMock} payload={null} onSave={onSaveMock} />
    );
    const trigger = screen.getByRole('button', { name: /Applied/i, expanded: false });
    fireEvent.click(trigger);
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const offerOption = screen.getByRole('option', { name: 'Offer' });
    fireEvent.click(offerOption);
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getAllByText('Offer').length).toBeGreaterThan(0);
  });
});
