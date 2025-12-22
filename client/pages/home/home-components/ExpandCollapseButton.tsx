import openJobCardIcon from "@/assets/icons/job-card-open.svg";
import closeJobCardIcon from "@/assets/icons/job-card-close.svg";
import { useJobCard } from "@/pages/home/hooks/useJobCard";

export function ExpandCollapseButton() {
  const { expandAllCards, collapseAllCards } = useJobCard();

  return (
    <div className="flex gap-8 control-bar-container">
      <img
        src={openJobCardIcon}
        alt="Expand All"
        className="w-5 h-5 icon -rotate-90"
        onClick={expandAllCards}
      />
      <img
        src={closeJobCardIcon}
        alt="Collapse All"
        className="w-5 h-5 icon rotate-90"
        onClick={collapseAllCards}
      />
    </div>
  );
}
