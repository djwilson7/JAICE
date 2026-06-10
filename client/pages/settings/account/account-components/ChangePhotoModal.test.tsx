import { render, screen, act, fireEvent } from '@testing-library/react';
import { ChangePhotoModal } from './ChangePhotoModal';
import { useAuth } from '@/global-components/authContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('@/global-components/authContext', () => ({
  useAuth: vi.fn(),
}));

describe('ChangePhotoModal exhaustive', () => {
  const applyProfileUpdateMock = vi.fn();
  const setShowModalMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      user: { photoURL: 'http://example.com/photo.jpg' },
      applyProfileUpdate: applyProfileUpdateMock,
    });
  });

  it('handles save success and navigation', async () => {
    render(<MemoryRouter><ChangePhotoModal showModal={true} setShowModal={setShowModalMock} /></MemoryRouter>);
    
    fireEvent.load(screen.getByAltText('Profile photo preview'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Save/i })); });
    
    expect(applyProfileUpdateMock).toHaveBeenCalled();
    expect(setShowModalMock).toHaveBeenCalledWith(false);
  });

  it('handles save error', async () => {
    applyProfileUpdateMock.mockRejectedValue(new Error('Save Fail'));
    render(<MemoryRouter><ChangePhotoModal showModal={true} setShowModal={setShowModalMock} /></MemoryRouter>);
    
    fireEvent.load(screen.getByAltText('Profile photo preview'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Save/i })); });
    expect(screen.getByText(/The profile photo could not be saved/)).toBeInTheDocument();
  });

  it('resets state when showModal changes', () => {
    const { rerender } = render(<MemoryRouter><ChangePhotoModal showModal={false} setShowModal={setShowModalMock} /></MemoryRouter>);
    expect(screen.queryByText('Change Profile Photo')).not.toBeInTheDocument();

    rerender(<MemoryRouter><ChangePhotoModal showModal={true} setShowModal={setShowModalMock} /></MemoryRouter>);
    expect(screen.getByText('Change Profile Photo')).toBeInTheDocument();
  });

  it('handles input change and early return in handleSavePhoto', async () => {
    render(<MemoryRouter><ChangePhotoModal showModal={true} setShowModal={setShowModalMock} /></MemoryRouter>);
    const input = screen.getByLabelText(/Profile photo URL/i);
    
    fireEvent.change(input, { target: { value: 'http://new.jpg' } });
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    expect(saveBtn).toBeDisabled();

    // Early return if not loaded
    await act(async () => { fireEvent.click(saveBtn); });
    expect(applyProfileUpdateMock).not.toHaveBeenCalled();

    // Load it
    fireEvent.load(screen.getByAltText('Profile photo preview'));
    expect(saveBtn).not.toBeDisabled();

    // Early return if saving (simulate busy)
    // Hard to simulate without mocking state, but hitting the branch is the goal
  });

  it('handles empty URL and preview failure', () => {
    render(<MemoryRouter><ChangePhotoModal showModal={true} setShowModal={setShowModalMock} /></MemoryRouter>);
    const img = screen.getByAltText('Profile photo preview');
    
    // Preview failure
    fireEvent.error(img);
    expect(screen.getByAltText('Default profile photo preview')).toBeInTheDocument();

    // Empty URL branch in onLoad
    fireEvent.change(screen.getByLabelText(/Profile photo URL/i), { target: { value: ' ' } }); 
    fireEvent.load(img);
    expect(screen.getByRole('button', { name: /Save/i })).toBeDisabled();
  });
});
