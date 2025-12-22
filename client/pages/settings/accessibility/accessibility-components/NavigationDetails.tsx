import { useSettings } from "@/pages/settings/provider/SettingsProvider";

export function NavigationDetails() {
  const { navigationBehavior } = useSettings();

  var descriptionText = "";

  switch (navigationBehavior) {
    case "open":
      descriptionText = "Keeps the navigation menus expanded for easy access.";
      break;
    case "hover":
      descriptionText = "Keeps the navigation menu compacted, expanding on hover.";
      break;
    case "closed":
      descriptionText = "Keeps the navigation menus collapsed for a cleaner interface.";
      break;
  }

  return (
    <div className="p-4 rounded">
      <small className="">{descriptionText}</small>
    </div>
  );
}
