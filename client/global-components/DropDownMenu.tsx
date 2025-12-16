// import { localfiles } from "@/directory/path/to/localimport";
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
      className="drop-down-menu-container gap-2"
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
          className="drop-down-menu-option-container p-1"
        >
          {options.map((option) => (
            <option
              key={option.value}
              className="drop-down-menu-option"
              value={option.value}
              onClick={() => setSelectedOption(option.value)}
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
        title="Clear Search"
        style={{
          cursor: selectedOption !== "new" ? "pointer" : "default",
          visibility: selectedOption !== "new" ? "visible" : "hidden",
        }}
        animate={{opacity: selectedOption !== "new" ? 1 : 0}}
      />
    </motion.div>
  );
}
