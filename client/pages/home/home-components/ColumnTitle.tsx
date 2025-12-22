import { useState } from "react";
import { motion } from "framer-motion";

interface ColumnTitleProps {
  title: string;
  index: number;
  onToggle?: (index: number) => void;
  canToggle?: boolean;
}

const columnDescriptions = {
  Applied: "Applications you’ve sent out.",
  Interview: "Emails about interviews or next steps.",
  Offer: "Job offers sent your way.",
  Accepted: "Offers you’ve chosen to accept.",
  Rejected: "Applications that weren’t selected.",
  Processing: "Fresh emails that are being processed.",
  Review: "These applications need your review.",
};

export function ColumnTitle({
  title,
  index,
  onToggle,
  canToggle,
}: ColumnTitleProps) {
  const [isSelected, setIsSelected] = useState(title);

  const headerClass = "flex w-full items-center justify-center";

  if (!canToggle) {
    return (
      <div className="flex flex-col w-full items-center justify-center">
        <div className={headerClass}>
          <div className="flex w-full items-center justify-center">
            <h2>{title}</h2>
          </div>
        </div>
        <div className="flex w-full items-center justify-center">
          <small className="text-center secondary-text">
            {columnDescriptions[title as keyof typeof columnDescriptions]}
          </small>
        </div>
      </div>
    );
  }
  const toggleOptions = ["Accepted", "Rejected"];

  const handleToggle = () => {
    if (onToggle) {
      onToggle(index);
      const currentIndex = toggleOptions.indexOf(isSelected);
      const nextIndex = (currentIndex + 1) % toggleOptions.length;
      setIsSelected(toggleOptions[nextIndex]);
    }
  };

  return (
    <div className="flex flex-col w-full items-center justify-center">
      <motion.div
        className={headerClass}
        onClick={handleToggle}
        style={{ cursor: "pointer" }}
        title={"Cycle between Accepted and Rejected. Click to toggle."}
      >
        <motion.h2 animate={{ scale: title === toggleOptions[0] ? 1 : 0.6 }}>
          {toggleOptions[0]}
        </motion.h2>
        <motion.h2 animate={{ scale: title === toggleOptions[1] ? 1 : 0.6 }}>
          {toggleOptions[1]}
        </motion.h2>
      </motion.div>
      <div className="flex w-full items-center justify-center">
        <small className="text-center secondary-text">
          {columnDescriptions[title as keyof typeof columnDescriptions]}
        </small>
      </div>
    </div>
  );
}
