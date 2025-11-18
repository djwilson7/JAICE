// import { localfiles } from "@/directory/path/to/localimport";

import searchIcon from "@/assets/icons/search.svg";
import circleXIcon from "@/assets/icons/circle-xmark.svg";
import { motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
/**
 * Search Bar Props
 * @param isSearching - Boolean indicating if the search bar is active
 * @param setIsSearching - Function to update the searching state
 * @param searchQuery - Current value of the search query
 * @param setSearchQuery - Function to update the search query
 */
interface SearchBarProps {
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}

/**
 * Search Bar Component
 *
 * A search bar that expands on hover and allows input. Displays a clear icon when there is text in the input and will collapse when empty and not hovered.
 *
 * @param isSearching - Boolean indicating if the search bar is active
 * @param setIsSearching - Function to update the searching state
 * @param searchQuery - Current value of the search query
 * @param setSearchQuery - Function to update the search query
 * @returns A search bar component
 */
export function SearchBar({
  isSearching,
  setIsSearching,
  searchQuery,
  setSearchQuery,
}: SearchBarProps) {
  // Constants and Refs
  const COLLAPSED = 40;
  const TYPING_BUFFER = 40;
  const contentRef = useRef<HTMLDivElement>(null);

  // State
  const [baseWidth, setBaseWidth] = useState(COLLAPSED * 2);
  const [targetWidth, setTargetWidth] = useState(COLLAPSED * 3);
  const [isFocused, setIsFocused] = useState(false);

  // This ensures the width is measured after the component mounts and whenever isSearching changes
  useLayoutEffect(() => {
    if (!isSearching || !contentRef.current) {
      setTargetWidth(COLLAPSED);
      return;
    }

    // requestAnimationFrame ensures DOM is updated before measuring
    requestAnimationFrame(() => {
      const measured = Math.max(COLLAPSED, contentRef.current!.scrollWidth);
      setBaseWidth(measured);
      setTargetWidth(searchQuery ? measured + TYPING_BUFFER : measured);
    });
  }, [isSearching]);

  // Update target width when searchQuery changes
  useEffect(() => {
    if (!isSearching) return;
    setTargetWidth(searchQuery ? baseWidth + TYPING_BUFFER : baseWidth);
  }, [searchQuery, baseWidth, isSearching]);

  const iconStyle = {
    filter:
      "brightness(0) saturate(100%) invert(81%) sepia(11%) saturate(464%) hue-rotate(170deg) brightness(95%) contrast(85%)",
  };

  return (
    <motion.div
      className="flex group items-center justify-start overflow-hidden gap-2 rounded cursor-pointer"
      onMouseEnter={() => setIsSearching(true)}
      onMouseLeave={() => {
        if (searchQuery === "" && !isFocused) {
          setIsSearching(false);
        }
      }}
      animate={{ width: targetWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {" "}
      {/* ^ Main Container adapts to width changes ^ */}
      {/* Content Container is measured for dynamic width */}
      <div ref={contentRef} className="flex items-center gap-2 p-2">
        <img
          src={searchIcon}
          alt="Search Icon"
          className="w-5 h-5 shrink-0"
          style={iconStyle}
        />

        {/* Input field appears when hovering, and expands when typing */}
        {isSearching ? (
          <motion.div
            key="search-input"
            className="flex items-center min-w-[5rem] gap-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}  //when we click into the input and the cursor is blinking
              onBlur={() => {                     //when we click away from the search bar and the field is empty
                setIsFocused(false);
                if (searchQuery === "") setIsSearching(false);
              }}
              className="w-full h-full border-transparent focus:border-transparent focus:ring-0 outline-none bg-[var(--color-gray-2)] rounded"
            />

            {/* Clear Icon appears when there is text in the input */}
            <img
              src={circleXIcon}
              alt="Clear Search Icon"
              className={`w-3 h-3 shrink-0`}
              style={{
                ...iconStyle,
                cursor: "pointer",
                visibility: searchQuery !== "" ? "visible" : "hidden",
              }}
              onClick={() => setSearchQuery("")}
            />
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  );
}
