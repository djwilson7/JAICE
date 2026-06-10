import { render, screen, fireEvent, act } from '@testing-library/react';
import ConnectEmailModal from './ConnectEmailModal';
import { vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { checkGmailStatus } from '@/pages/home/utils/checkGmailStatus';

vi.mock('@/pages/home/utils/checkGmailStatus', () => ({
  checkGmailStatus: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('ConnectEmailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <MemoryRouter>
        <ConnectEmailModal isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Email Connection Status')).not.toBeInTheDocument();
  });

  it('renders disconnected state', () => {
    (checkGmailStatus as any).mockImplementation(({ setGmailConnected }: any) => {
        setGmailConnected(false);
    });

    render(
      <MemoryRouter>
        <ConnectEmailModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText('Email Connection Status')).toBeInTheDocument();
    expect(screen.getByText('Gmail is not connected')).toBeInTheDocument();
    
    const linkBtn = screen.getByRole('button', { name: /Link/i });
    fireEvent.click(linkBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('renders connected state', () => {
    (checkGmailStatus as any).mockImplementation(({ setGmailConnected }: any) => {
        setGmailConnected(true);
    });

    render(
      <MemoryRouter>
        <ConnectEmailModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByText('Gmail is connected')).toBeInTheDocument();
    
    const disconnectBtn = screen.getByRole('button', { name: /Disconnect/i });
    fireEvent.click(disconnectBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('handles error state', () => {
    (checkGmailStatus as any).mockImplementation(({ setGmailError }: any) => {
        setGmailError('Failed');
    });

    render(
      <MemoryRouter>
        <ConnectEmailModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
