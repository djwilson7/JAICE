import searchIcon from "@/assets/icons/search.svg";
import circleXIcon from "@/assets/icons/circle-xmark.svg";
import { motion } from "framer-motion";
import { useState } from "react";
import { getCSSVar } from "@/utils/getCSSVar";

interface SearchBarProps {
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

export function SearchBar({
  setIsSearching,
  searchQuery,
  setSearchQuery,
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      className="search-bar group"
      onMouseEnter={() => setIsSearching(true)}
      onMouseLeave={() => {
        if (searchQuery === "" && !isFocused) {
          setIsSearching(false);
        }
      }}
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
      <motion.div key="search-input" className="flex items-center gap-2 ">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (searchQuery === "") setIsSearching(false);
          }}
          className="w-full h-full p-1 bg-transparent outline-none text-sm"
          title="Search by job title, company, or dates."
        />
      </motion.div>
      <img
        src={circleXIcon}
        alt="Clear Search Icon"
        className={`w-4 h-4 shrink-0 icon`}
        style={{
          cursor: "pointer",
          visibility: searchQuery !== "" ? "visible" : "hidden",
        }}
        onClick={() => setSearchQuery("")}
        title="Clear Search"
      />
    </motion.div>
  );
}
