import openJobCardIcon from "@/assets/icons/job-card-open.svg";
import closeJobCardIcon from "@/assets/icons/job-card-close.svg";
import { useJobCard } from "@/pages/home/hooks/useJobCard";

export function ExpandCollapseButton() {
  const { expandAllCards, collapseAllCards, isExpanded } = useJobCard();
  const icon = isExpanded ? openJobCardIcon : closeJobCardIcon;
  const text = isExpanded ? "Collapse" : "Expand";
  const handleClick = isExpanded ? collapseAllCards : expandAllCards;

  return (
    <div className="flex control-bar-container">
      <div className="flex flex-row gap-2 items-center justify-center" onClick={handleClick}>
        <img
          src={icon}
          alt={text + " All"}
          className={`w-5 h-5 icon -rotate-90`}
          title={text + " All"}
        />
        <span className="whitespace-nowrap">{text + " All"}</span>
      </div>
    </div>
  );
}
