import accessibilityIcon from "@/assets/icons/accessibility.svg";
import layoutIcon from "@/assets/icons/layout.svg";
import userIcon from "@/assets/icons/user.svg";
import { AccountSettings } from "@/pages/settings/account/AccountSettings";
import { DisplaySettings } from "@/pages/settings/display/DisplaySettings";

function SettingsGroupHeader({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="settings-group-header">
      <img
        src={icon}
        alt=""
        aria-hidden="true"
        className="settings-group-icon icon"
      />
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className="settings-page page-style">
      <main className="settings-shell">
        <header className="settings-page-header">
          <p className="settings-eyebrow">Account preferences</p>
          <h1>Settings</h1>
          <p>
            Manage your profile, connected services, appearance, and workspace
            behavior in one place.
          </p>
        </header>

        <section className="settings-group">
          <SettingsGroupHeader
            icon={userIcon}
            title="Profile & Account"
            description="Update your identity, manage Gmail integration, or remove your account."
          />
          <AccountSettings />
        </section>

        <DisplaySettings
          appearanceHeader={
            <SettingsGroupHeader
              icon={accessibilityIcon}
              title="Appearance"
              description="Control theme, text size, contrast, and animation speed."
            />
          }
          layoutHeader={
            <SettingsGroupHeader
              icon={layoutIcon}
              title="Layout & Behavior"
              description="Choose how navigation and job application cards behave."
            />
          }
        />
      </main>
    </div>
  );
}
