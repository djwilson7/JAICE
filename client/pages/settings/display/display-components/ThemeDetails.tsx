import { useSettings } from "@/pages/settings/provider/SettingsProvider";

export function ThemeDetails() {
  const { theme } = useSettings();

  var descriptionText = "";

  switch (theme) {
    case "light":
      descriptionText = "Virbrant light theme with high contrast for daytime use.";
      break;
    case "dark":
      descriptionText = "Rich dark theme with balanced colors for low-light environments.";
      break;
  }

  return (
    <div className="detail-text">
      <small>{descriptionText}</small>
    </div>
  );
}
