// import { localfiles } from "@/directory/path/to/localimport";

import bellIcon from "@/assets/icons/bell-notification-social-media.svg";
import { AnimatePresence, motion } from "framer-motion";

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

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0, x: -4 }}
            animate={{ opacity: 1, width: "auto", x: 0 }}
            exit={{ opacity: 0, width: 0, x: -4 }}
            transition={{
              duration: 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex items-center overflow-hidden whitespace-nowrap"
          >
            {alertMessage}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Conditionally render the alert message if the box is open (on hover)*/}
    </motion.div>
  );
}
