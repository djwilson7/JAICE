import searchIcon from "@/assets/icons/search.svg";
import circleXIcon from "@/assets/icons/circle-xmark.svg";
import { motion } from "framer-motion";
import { getCSSVar } from "@/utils/getCSSVar";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

export function SearchBar({
  searchQuery,
  setSearchQuery,
}: SearchBarProps) {
  return (
    <motion.div
      className="control-bar-container group"
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
      }}
    >
      <img
        src={searchIcon}
        alt="Search Icon"
        className="w-5 h-5 shrink-0 icon"
        title="Search Job Cards"
      />
      <motion.div key="search-input" className="flex items-center">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="outline-none"
          title="Search by job title, company, or dates."
        />
      </motion.div>
      <motion.img
        src={circleXIcon}
        alt="Clear Search Icon"
        className={`w-4 h-4 shrink-0 icon`}
        style={{
          cursor: searchQuery !== "" ? "pointer" : "default",
          opacity: searchQuery !== "" ? 1 : 0,
        }}
        animate={{opacity: searchQuery !== "" ? 1 : 0}}
        onClick={() => setSearchQuery("")}
        title="Clear Search"
      />
    </motion.div>
  );
}
