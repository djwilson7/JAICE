import { getCSSVar } from "@/utils/getCSSVar";
import { motion } from "framer-motion";
import { useIsMultiSelecting } from "@/pages/home/hooks/useIsMultiSelecting";
import { useSelectedJobs } from "@/pages/home/hooks/useSelectedJobs";

interface CheckBoxToggleProps {
  label?: string;
  inactiveIcon?: string;
  activeIcon?: string;
}

export function CheckBoxToggle({
  label,
  inactiveIcon,
  activeIcon,
}: CheckBoxToggleProps) {
  const { isMultiSelecting, setIsMultiSelecting } = useIsMultiSelecting();
  const { setSelectedJobs } = useSelectedJobs();

  const handleToggle =  () => {
    setIsMultiSelecting(!isMultiSelecting);
    if (isMultiSelecting) {
      setSelectedJobs([]); // Clear selected jobs when turning off multi-select
    }
  };

  return (
    <motion.div
      className="control-bar-container"
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
      }}
      onClick={handleToggle}
    >
      <img
        src={isMultiSelecting ? activeIcon : inactiveIcon}
        alt="Toggle Icon"
        className="w-5 h-5 shrink-0 icon"
      />
      <input
        type="checkbox"
        checked={isMultiSelecting}
        className="hidden cursor-pointer"
        title="Toggle Multi-Select"
        onChange={() => console.log("Checked Box")}
      />
      <span className="cursor-pointer select-none whitespace-nowrap">
        {label}
      </span>
    </motion.div>
  );
}
