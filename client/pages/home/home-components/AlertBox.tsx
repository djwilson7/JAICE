// import { localfiles } from "@/directory/path/to/localimport";

import bellIcon from "@/assets/icons/bell-notification-social-media.svg";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface AlertBoxProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  alertMessage?: string;
}

/**
 * AlertBox Component
 *
 * A component that displays an alert icon and expands to show an alert message on hover.
 *
 * Intended to be a quick notification center related to application status updates.
 * @param isOpen - Boolean indicating if the alert box is expanded
 * @param setIsOpen - Function to update the open state of the alert box
 * @param alertMessage - Optional message to display in the alert box
 * @returns An expandable alert box that shows an alert message on hover.
 */
export function AlertBox({ isOpen, setIsOpen, alertMessage }: AlertBoxProps) {
  const contentRef = useRef<HTMLDivElement>(null); // Ref to the content div to measure its width
  const [targetWidth, setTargetWidth] = useState(40); // State to control the target width of the alert box

  // Update target width when isOpen or alertMessage changes
  useEffect(() => {
    // If the box is closed or contentRef is not set, set width to icon size
    if (!isOpen || !contentRef.current) {
      setTargetWidth(40);
      return;
    }

    // Use requestAnimationFrame to ensure the DOM has updated before measuring
    requestAnimationFrame(() => {
      // Set target width to content width plus some padding
      setTargetWidth(contentRef.current!.offsetWidth + 16);
    });
  }, [isOpen, alertMessage]);

  return (
    <motion.div
      className="flex items-center justify-start gap-2 p-2 rounded cursor-pointer overflow-hidden"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      animate={{ width: targetWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Content Container */}
      <div ref={contentRef} className="flex items-center gap-2">
        <img
          src={bellIcon}
          alt="Alert Icon"
          className="w-5 h-5 shrink-0 icon"
        />

        {/* Conditionally render the alert message if the box is open (on hover)*/}
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2"
          >
            <p className="whitespace-nowrap">{alertMessage}</p>
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
