// import { localfiles } from "@/directory/path/to/localimport";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * CheckBox Toggle Props
 * @param label - Optional label to display next to the checkbox
 * @param inactiveIcon - Icon to display when the checkbox is unchecked
 * @param activeIcon - Icon to display when the checkbox is checked
 * @param isChecked - Boolean indicating if the checkbox is checked
 * @param setIsChecked - Function to update the checked state
 */
interface CheckBoxToggleProps {
  label?: string;
  inactiveIcon?: string;
  activeIcon?: string;
  isChecked: boolean;
  setIsChecked: (value: boolean) => void;
}

/**
 * Check Box Toggle Component
 *
 * Takes an optional label, a boolean for checked state, and a function to cycle that state.
 * @param label - Optional label to display next to the checkbox
 * @param inactiveIcon - Icon to display when the checkbox is unchecked
 * @param activeIcon - Icon to display when the checkbox is checked
 * @param isChecked - Boolean indicating if the checkbox is checked
 * @param setIsChecked - Function to update the checked state
 * @returns A checkbox toggle component, with the label if provided. The hit area is the entire component.
 */
export function CheckBoxToggle({
  label,
  inactiveIcon,
  activeIcon,
  isChecked,
  setIsChecked,
}: CheckBoxToggleProps) {
  // Ref for the content div to measure its width
  const contentRef = useRef<HTMLDivElement>(null);
  // State to hold the target width for animation
  const [targetWidth, setTargetWidth] = useState(40);
  // Effect to update target width based on content and checked state
  useEffect(() => {
    if (!isChecked || !contentRef.current) {
      setTargetWidth(40);
      return;
    }
  // Use requestAnimationFrame to ensure DOM is updated before measuring
    requestAnimationFrame(() => {
      setTargetWidth(contentRef.current!.offsetWidth + 16);
    });
  }, [isChecked, label]);

  const iconStyle = {
    filter:
      "brightness(0) saturate(100%) invert(81%) sepia(11%) saturate(464%) hue-rotate(170deg) brightness(95%) contrast(85%)",
  };

  return (
    <motion.div
      className="flex relative items-center justify-start p-2 gap-4 rounded cursor-pointer overflow-hidden"
      animate={{ width: targetWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div ref={contentRef} className="flex items-center gap-2">
        <img
          src={isChecked ? activeIcon : inactiveIcon}
          alt="Toggle Icon"
          className="w-5 h-5 flex-shrink-0"
          style={iconStyle}
        />
        <input
          type="checkbox"
          checked={isChecked}
          onClick={() => {
            setIsChecked(!isChecked);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {label ? (
          <label className="select-none whitespace-nowrap ">{label}</label>
        ) : null}
      </div>
    </motion.div>
  );
}
