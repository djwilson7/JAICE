import openJobCardIcon from "@/assets/icons/job-card-open.svg";
import closeJobCardIcon from "@/assets/icons/job-card-close.svg";
import { useJobCard } from "@/pages/home/hooks/useJobCard";

interface ExpandCollapseButtonProps {
  compact?: boolean;
}

export function ExpandCollapseButton({ compact = false }: ExpandCollapseButtonProps) {
  const { openCount, expandAllCards, collapseAllCards } = useJobCard();

  const showCollapse = openCount > 0;

  const icon = showCollapse ? openJobCardIcon : closeJobCardIcon;
  const text = showCollapse ? "Collapse" : "Expand";
  const handleClick = showCollapse ? collapseAllCards : expandAllCards;

  return (
    <div className={`flex control-bar-container ${compact ? "control-bar-container-compact" : ""}`}>
      <div
        className="flex flex-row gap-2 items-center justify-center"
        onClick={handleClick}
        role="button"
        aria-label={text + " All"}
      >
        <img
          src={icon}
          alt={text + " All"}
          className={`w-5 h-5 icon -rotate-90`}
          title={text + " All"}
        />
        {!compact && (
          <span className="control-bar-label whitespace-nowrap">{text + " All"}</span>
        )}
      </div>
    </div>
  );
}
