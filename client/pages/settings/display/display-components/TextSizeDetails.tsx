import { useSettings } from "@/pages/settings/provider/settingsContext";

export function TextSizeDetails() {
  const { textScale } = useSettings();

  let descriptionText = "";

  switch (textScale) {
    case "small":
      descriptionText = "Smaller text size for more content on screen.";
      break;
    case "default":
      descriptionText = "Default text size for balanced readability.";
      break;
    case "large":
      descriptionText = "Larger text size for easier reading.";
      break;
  }

  return (
    <div className="detail-text">
      <small className="">{descriptionText}</small>
    </div>
  );
}
