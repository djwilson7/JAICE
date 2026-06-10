import { render, screen } from '@testing-library/react';
import { DeleteAccountModal } from './DeleteAccountModal';
import { vi } from 'vitest';

describe('DeleteAccountModal', () => {
  it('renders correctly when isOpen is true', () => {
    render(
      <DeleteAccountModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('Delete Your JAICE Account')).toBeInTheDocument();
    expect(screen.getByText('This action is permanent')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    render(
      <DeleteAccountModal
        isOpen={true}
        error="Deletion failed"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(screen.getByText('Deletion failed')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <DeleteAccountModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
