import circleXIcon from "@/assets/icons/circle-xmark.svg";
import { getCSSVar } from "@/utils/getCSSVar";
import { motion } from "framer-motion";

interface DropDownMenuProps {
  options: { value: string; label: string }[];
  selectedOption: string;
  setSelectedOption: (value: string) => void;
  leftIcon: string;
}

export function DropDownMenu({
  options,
  selectedOption,
  setSelectedOption,
  leftIcon,
}: DropDownMenuProps) {
  return (
    <motion.div
      className="control-bar-container"
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
      />
      <motion.div
        className="flex items-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value)}
          className="drop-down-menu"
        >
          {options.map((option) => (
            <option
              key={option.value}
              className="drop-down-menu-options"
              value={option.value}
              onClick={() => setSelectedOption(option.value)}
              selected={selectedOption === option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </motion.div>
      <motion.img
        src={circleXIcon}
        alt="Clear Order Icon"
        className={`w-4 h-4 shrink-0 icon`}
        onClick={() => setSelectedOption("new")}
        title="Set to Most Recent (Default)"
        style={{
          cursor: selectedOption !== "new" ? "pointer" : "default",
          opacity: selectedOption !== "new" ? 1 : 0,
        }}
        animate={{opacity: selectedOption !== "new" ? 1 : 0}}
      />
    </motion.div>
  );
}
