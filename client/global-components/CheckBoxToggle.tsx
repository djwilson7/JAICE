// import { localfiles } from "@/directory/path/to/localimport";
import { getCSSVar } from "@/utils/getCSSVar";
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
 


  return (
    <motion.div
      className="flex relative items-center justify-start p-2 gap-4 rounded cursor-pointer overflow-hidden"
      transition={{ type: "spring", stiffness: 300, damping: 30, duration: parseFloat(getCSSVar("--animation-duration")) || 0.2 }}
    >
      <div className="flex items-center gap-2">
        <img
          src={isChecked ? activeIcon : inactiveIcon}
          alt="Toggle Icon"
          className="w-5 h-5 flex-shrink-0 icon"
        />
        <input
          type="checkbox"
          checked={isChecked}
          onClick={() => {
            setIsChecked(!isChecked);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          title="Toggle Multi-Select"
          onChange={() => console.log("Checked Box")}
        />
        {label ? (
          <label className="select-none whitespace-nowrap secondary-text">{label}</label>
        ) : null}
      </div>
    </motion.div>
  );
}
