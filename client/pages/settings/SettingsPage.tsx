import { AccountSettings } from "@/pages/settings/account/AccountSettings";
import { DisplaySettings } from "@/pages/settings/display/DisplaySettings";

export function SettingsPage() {
  return (
    <div className="settings-page page-style">
      <main className="settings-shell">
        <header className="settings-page-header">
          <p className="settings-eyebrow">Preferences</p>
          <h1>Settings</h1>
          <p>
            Core profile, account, appearance, and workspace controls.
          </p>
        </header>

        <div className="settings-stack">
          <AccountSettings />
          <DisplaySettings />
        </div>
      </main>
    </div>
  );
}
