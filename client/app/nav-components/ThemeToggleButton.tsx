import type { NavigationBehavior } from "@/pages/settings/provider/settingsTypes";
import { NavButton } from "./NavButton";
import { getThemeData } from "@/utils/getThemeData";

export const ThemeToggleButton = ({
  hoverMode,
}: {
  hoverMode: NavigationBehavior;
}) => {
  const theme = getThemeData();
  const handleThemeToggle = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const currentContrast =
      document.documentElement.getAttribute("data-contrast");

    if (currentContrast === "bw") {
      const newTheme = "dark";
      const newContrast = "default";

      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.setAttribute("data-contrast", newContrast);
      window.dispatchEvent(new Event("appearancechange"));
      return;
    }

    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);

    const event = new Event("appearancechange");
    window.dispatchEvent(event);
  };

  return (
    <NavButton
      icon={theme.icon}
      label={theme.label}
      onClick={handleThemeToggle}
      isSelected={false}
      hoverMode={hoverMode}
      title={theme.title}
    />
  );
};