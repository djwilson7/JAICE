import { render, screen } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import { vi } from 'vitest';

vi.mock('@/pages/settings/account/AccountSettings', () => ({
  AccountSettings: () => <div data-testid="account-settings">AccountSettings</div>,
}));

vi.mock('@/pages/settings/display/DisplaySettings', () => ({
  DisplaySettings: () => <div data-testid="display-settings">DisplaySettings</div>,
}));

describe('SettingsPage', () => {
  it('renders correctly', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByTestId('account-settings')).toBeInTheDocument();
    expect(screen.getByTestId('display-settings')).toBeInTheDocument();
  });
});
