import { render, screen, fireEvent } from '@testing-library/react';
import { DaysToSync } from './DaysToSync';
import { vi, describe, it, expect } from 'vitest';
import React from 'react';

describe('DaysToSync exhaustive', () => {
  const options = [
    { label: '30 Days', days: 30 },
    { label: '60 Days', days: 60 },
  ];

  it('handles empty options fallback', () => {
    render(
      <DaysToSync
        show={true}
        options={[]}
        onSelection={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText(/No period selected/)).toBeInTheDocument();
  });

  it('selects an option and confirms', () => {
    const onSelection = vi.fn();
    render(
      <DaysToSync
        show={true}
        options={options}
        onSelection={onSelection}
        onCancel={vi.fn()}
      />
    );

    // Click 60 days
    fireEvent.click(screen.getByRole('radio', { name: '60 Days' }));
    expect(screen.getByText(/60 Days selected/)).toBeInTheDocument();

    // Click Confirm
    fireEvent.click(screen.getByRole('button', { name: /Confirm/i }));
    expect(onSelection).toHaveBeenCalledWith(60);
  });
});
