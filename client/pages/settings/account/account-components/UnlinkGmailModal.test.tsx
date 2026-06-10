import { render, screen } from '@testing-library/react';
import { UnlinkGmailModal } from './UnlinkGmailModal';
import { vi } from 'vitest';

describe('UnlinkGmailModal', () => {
  it('renders correctly when isOpen is true', () => {
    render(
      <UnlinkGmailModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('Unlink Gmail Account')).toBeInTheDocument();
    expect(screen.getByText('Automatic email tracking will stop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlink/i })).toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    render(
      <UnlinkGmailModal
        isOpen={true}
        error="Unlink failed"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('Unlink failed')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <UnlinkGmailModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
