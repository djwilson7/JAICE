import { useSettings } from "@/pages/settings/provider/SettingsProvider";

export function MotionDetails() {
  const { motion } = useSettings();

  var descriptionText = "";

  switch (motion) {
    case "slow":
      descriptionText = "Reduced animation speeds for a relaxed experience.";
      break;
    case "default":
      descriptionText = "Balanced speeds for a fluid experience.";
      break;
    case "fast":
      descriptionText = "Increased animation speeds for a snappier experience.";
      break;
  }

  return (
    <div className="p-4 rounded">
      <small className="">{descriptionText}</small>
    </div>
  );
}
