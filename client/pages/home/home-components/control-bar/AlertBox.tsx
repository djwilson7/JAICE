// import { localfiles } from "@/directory/path/to/localimport";

import bellIcon from "@/assets/icons/bell-notification-social-media.svg";
import { motion } from "framer-motion";

interface AlertBoxProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  alertMessage?: string;
}

export function AlertBox({ isOpen, setIsOpen, alertMessage }: AlertBoxProps) {
  return (
    <motion.div
      className="alert-container"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 24,
        duration: 0.15,
      }}
    >
      {/* Content Container */}
      {/* Icon is always shown */}
      <img src={bellIcon} alt="Alert Icon" className="w-5 h-5 shrink-0 icon" />

      <motion.div
        initial={{ opacity: 0, width: 0 }}
        animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? "auto" : 0 }}
        exit={{ opacity: 0, width: 0 }}
        className="flex items-center gap-2 whitespace-nowrap"
      >
        {alertMessage}
      </motion.div>
      {/* Conditionally render the alert message if the box is open (on hover)*/}
    </motion.div>
  );
}
