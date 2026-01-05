import { useSettings } from "@/pages/settings/provider/SettingsProvider";

export function ContrastDetails() {
  const { contrast } = useSettings();

  var descriptionText = "";

  switch (contrast) {
    case "low":
      descriptionText =
        "Softer shades and shadows for a gentle visual experience.";
      break;
    case "default":
      descriptionText = "Balanced colors for everyday use.";
      break;
    case "high":
      descriptionText =
        "Vivid colors and sharp contrasts for enhanced visibility.";
      break;
    case "bw":
      descriptionText =
        "Colors are significantly reduced to black and white for maximum contrast.";
      break;
  }

  return (
    <div className="p-4 rounded">
      <small className="">{descriptionText}</small>
    </div>
  );
}
