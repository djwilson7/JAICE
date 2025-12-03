import { motion } from "framer-motion";
import { getCSSVar } from "@/utils/getCSSVar";
import { UserBlock } from "./UserBlock";
import { BrandBlock } from "./BrandBlock";
import { SearchBar } from "./SearchBar";

export function MainHeader() {
  return (
    <motion.header
      className={`app-header z-500`}
      initial="rest"
      transition={{
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
      }}
    >
      <div className={`flex w-full h-full items-center justify-center gap-4 animate-element`}>
        <div className="flex w-1/2 lg:w-1/4 animate-element">
          <UserBlock />
        </div>
        <div className="flex w-1/2 lg:w-1/2 justify-center animate-element">
          <BrandBlock />
        </div>
        <div className="flex w-1/4 hidden lg:block animate-element">
          <SearchBar />
        </div>
      </div>
    </motion.header>
  );
}
