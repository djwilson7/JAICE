// import { localfiles } from "@/directory/path/to/localimport";
import circleXIcon from "@/assets/icons/circle-xmark.svg";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Menu Selector Props
 * @param options - Array of option objects with value and label
 * @param isOpen - Boolean indicating if the menu is open
 * @param setIsOpen - Function to update the open state
 * @param selectedOption - Currently selected option value
 * @param setSelectedOption - Function to update the selected option
 * @param leftIcon - Icon to display on the left side of the menu
 */
interface DropDownMenuProps {
  options: { value: string; label: string }[];
  isOpen: boolean;
  selectedOption: string;
  setIsOpen: (value: boolean) => void;
  setSelectedOption: (value: string) => void;
  leftIcon: string;
}

/**
 * Drop Down Menu Component
 *
 * Creates a dropdown menu for selecting options. Displays a left icon and handles open/close state on hover and selection
 * @param options - Array of option objects with value and label
 * @param isOpen - Boolean indicating if the menu is open
 * @param setIsOpen - Function to update the open state
 * @param selectedOption - Currently selected option value
 * @param setSelectedOption - Function to update the selected option
 * @param leftIcon - Icon to display on the left side of the menu
 * @returns A Drop down menu that will expand when hovered over, and collapse when set to the default value and the mouse leaves the area.
 */
export function DropDownMenu({
  options,
  isOpen,
  setIsOpen,
  selectedOption,
  setSelectedOption,
  leftIcon,
}: DropDownMenuProps) {
  // Ref for the content to measure its width
  const contentRef = useRef<HTMLDivElement>(null);
  // State for target width
  const [targetWidth, setTargetWidth] = useState(40);
  // Update target width when isOpen or selectedOption changes
  useEffect(() => {
    if (!isOpen || !contentRef.current) {
      setTargetWidth(40);
      return;
    }
    // Use requestAnimationFrame to ensure DOM is updated before measuring
    requestAnimationFrame(() => {
      setTargetWidth(contentRef.current!.offsetWidth + 16);
    });
  }, [isOpen, selectedOption]);
  
  // Styles
  const menuStyle: React.CSSProperties = {
    color: "white",
    borderRadius: "0.5rem",
    outline: "none",
    backgroundColor: "var(--color-gray-2)",
    cursor: "pointer",
  };

  const optionStyle: React.CSSProperties = {
    color: "white",
    borderRadius: "0.5rem",
    padding: "0.25rem",
    backgroundColor: "var(--color-blue-1)",
    cursor: "pointer",
  };

  const iconStyle = {
    filter:
      "brightness(0) saturate(100%) invert(81%) sepia(11%) saturate(464%) hue-rotate(170deg) brightness(95%) contrast(85%)",
  };

  return (
    <motion.div
      className="flex justify-start items-center bg-transparent p-2 rounded cursor-pointer overflow-hidden"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={
        selectedOption === "default"
          ? () => setIsOpen(false)
          : () => setIsOpen(true)
      }
      animate={{ width: targetWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <motion.div
        style={menuStyle}
        ref={contentRef}
        className="gap-2 flex items-center justify-center"
      >
        <img
          src={leftIcon}
          alt="Filter Icon"
          className={`w-5 h-5 shrink-0`}
          style={iconStyle}
        />
        {isOpen ? (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <select
              style={menuStyle}
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
            >
              {options.map((option) => (
                <option
                  key={option.value}
                  style={optionStyle}
                  value={option.value}
                  onClick={() => setSelectedOption(option.value)}
                >
                  {option.label}
                </option>
              ))}
            </select>
            {selectedOption !== "default" ? (
              <img
                src={circleXIcon}
                alt="Clear Filter Icon"
                className={`w-3 h-3 shrink-0`}
                style={iconStyle}
                onClick={() => setSelectedOption("default")}
              />
            ) : null}
          </motion.div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}
