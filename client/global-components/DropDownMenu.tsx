import circleXIcon from "@/assets/icons/circle-xmark.svg";
import downChevron from "@/assets/icons/angle-small-down.svg";
import { getCSSVar } from "@/utils/getCSSVar";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface DropDownMenuProps {
  selectedOption: string;
  setSelectedOption: (value: string) => void;
  leftIcon: string;
  compact?: boolean;
}

const sortByOptions = [
  { value: "new", label: "Most Recent" },
  { value: "old", label: "Oldest First" },
  { value: "az", label: "Ascend (a-z)" },
  { value: "za", label: "Descend (z-a)" },
];

export function DropDownMenu({
  selectedOption,
  setSelectedOption,
  leftIcon,
  compact = false,
}: DropDownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected =
    sortByOptions.find((option) => option.value === selectedOption) ??
    sortByOptions[0];

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectOption = (value: string) => {
    setSelectedOption(value);
    setIsOpen(false);
  };

  return (
    <motion.div
      ref={menuRef}
      className={`control-bar-container relative ${compact ? "drop-down-menu-compact" : ""}`}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
      }}
    >
      <img
        src={leftIcon}
        alt="Filter Icon"
        className={`w-5 h-5 shrink-0 icon`}
        title="Order Job Cards"
        onClick={() => setIsOpen((open) => !open)}
      />
      <button
        type="button"
        className="drop-down-menu-trigger filter-selected-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={compact ? "drop-down-menu-selected-compact" : ""}>
          {selected.label}
        </span>
        <img
          src={downChevron}
          alt=""
          aria-hidden="true"
          className={`drop-down-menu-chevron icon ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <motion.div
          className="drop-down-menu-panel"
          role="menu"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: parseFloat(getCSSVar("--animation-duration")) }}
        >
          {sortByOptions.map((option) => (
            <button
              type="button"
              key={option.value}
              className="drop-down-menu-options"
              role="menuitem"
              aria-current={selectedOption === option.value}
              onClick={() => selectOption(option.value)}
            >
              {option.label}
            </button>
          ))}
        </motion.div>
      )}
      <motion.img
        src={circleXIcon}
        alt="Clear Order Icon"
        className={`w-4 h-4 shrink-0 icon ${
          selectedOption === "new" ? "pointer-events-none absolute opacity-0" : ""
        }`}
        onClick={(event) => {
          event.stopPropagation();
          selectOption("new");
        }}
        title="Set to Most Recent (Default)"
        style={{
          cursor: selectedOption !== "new" ? "pointer" : "default",
          opacity: selectedOption !== "new" ? 1 : 0,
        }}
        animate={{ opacity: selectedOption !== "new" ? 1 : 0 }}
      />
    </motion.div>
  );
}
