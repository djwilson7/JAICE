import Lottie from "lottie-react";
import { useThemeData } from "@/utils/getThemeData";
import { motion } from "framer-motion";

export function LoadingAnimation() {
  const themeData = useThemeData();

  return (
    <motion.div
      key="loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex items-center justify-center"
    >
      <Lottie
        animationData={themeData.loadingAnimation}
        loop
        className="flex w-150 h-150"
      />
    </motion.div>
  );
}
