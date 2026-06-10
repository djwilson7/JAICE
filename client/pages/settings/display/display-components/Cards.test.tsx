import { render, screen } from '@testing-library/react';
import { SettingCard, ButtonRow, SettingButton, SettingHeader } from './Cards';
import { vi } from 'vitest';

describe('Cards components', () => {
  it('renders SettingCard correctly', () => {
    render(<SettingCard><div>Test Card</div></SettingCard>);
    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });

  it('renders ButtonRow correctly', () => {
    render(<ButtonRow><div>Test Row</div></ButtonRow>);
    expect(screen.getByText('Test Row')).toBeInTheDocument();
  });

  it('renders SettingButton correctly', () => {
    render(
      <SettingButton label="Click Me" onClick={vi.fn()} isSelected={true} title="Test Title" />
    );
    const button = screen.getByRole('button', { name: 'Click Me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Test Title');
  });

  it('renders SettingHeader correctly', () => {
    render(<SettingHeader title="Test Title" description="Test Description" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });
});
