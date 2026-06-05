import { useSettings } from "@/pages/settings/provider/settingsContext";

export function ThemeDetails() {
  const { theme } = useSettings();

  let descriptionText = "";

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
