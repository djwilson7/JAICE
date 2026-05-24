import searchIcon from "@/assets/icons/search.svg";
import circleXIcon from "@/assets/icons/circle-xmark.svg";
import { motion } from "framer-motion";
import { getCSSVar } from "@/utils/getCSSVar";
import { useEffect, useRef, useState } from "react";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

export function SearchBar({
  searchQuery,
  setSearchQuery,
}: SearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const showInput = isExpanded || searchQuery !== "";

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        searchQuery === "" &&
        !searchBarRef.current?.contains(event.target as Node)
      ) {
        setIsExpanded(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [searchQuery]);

  return (
    <motion.div
      ref={searchBarRef}
      className={`control-bar-container search-bar group ${
        showInput ? "search-bar-expanded" : ""
      }`}
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
        onClick={() => setIsExpanded(true)}
      />
      <motion.div
        key="search-input"
        className="search-input-wrap flex min-w-0 flex-1 items-center"
      >
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onBlur={() => setIsExpanded(false)}
          className="w-full min-w-0 outline-none"
          title="Search by job title, company, or dates."
        />
      </motion.div>
      <motion.img
        src={circleXIcon}
        alt="Clear Search Icon"
        className={`w-4 h-4 shrink-0 icon`}
        aria-hidden={searchQuery === ""}
        style={{
          cursor: searchQuery !== "" ? "pointer" : "default",
          opacity: searchQuery !== "" ? 1 : 0,
        }}
        animate={{opacity: searchQuery !== "" ? 1 : 0}}
        onClick={() => {
          setSearchQuery("");
          setIsExpanded(false);
        }}
        title="Clear Search"
      />
    </motion.div>
  );
}
