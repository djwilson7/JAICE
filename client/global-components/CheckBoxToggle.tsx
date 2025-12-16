import { getCSSVar } from "@/utils/getCSSVar";
import { motion } from "framer-motion";

interface CheckBoxToggleProps {
  label?: string;
  inactiveIcon?: string;
  activeIcon?: string;
  isChecked: boolean;
  setIsChecked: (value: boolean) => void;
}

export function CheckBoxToggle({
  label,
  inactiveIcon,
  activeIcon,
  isChecked,
  setIsChecked,
}: CheckBoxToggleProps) {
  return (
    <motion.div
      className="control-bar-container"
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
      }}
      onClick={() => setIsChecked(!isChecked)}
    >
      <img
        src={isChecked ? activeIcon : inactiveIcon}
        alt="Toggle Icon"
        className="w-5 h-5 shrink-0 icon"
      />
      <input
        type="checkbox"
        checked={isChecked}
        className="hidden cursor-pointer"
        title="Toggle Multi-Select"
        onChange={() => console.log("Checked Box")}
      />
      <span className="cursor-pointer select-none">{label}</span>
    </motion.div>
  );
}
