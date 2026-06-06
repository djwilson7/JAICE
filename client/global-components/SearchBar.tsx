import searchIcon from "@/assets/icons/search.svg";
import xIcon from "@/assets/icons/x.svg";
import { motion } from "framer-motion";
import { getCSSVar } from "@/utils/getCSSVar";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettings } from "@/pages/settings/provider/settingsContext";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  placeholder?: string;
  searchTitle?: string;
  inputTitle?: string;
  focusSignal?: number;
  collapsed?: boolean;
  onCollapsedActivate?: () => void;
  className?: string;
  variant?: "standard" | "premium";
}

export function SearchBar({
  searchQuery,
  setSearchQuery,
  placeholder = "Search...",
  searchTitle = "Search Job Cards",
  inputTitle = "Search by email subject, stage, or date.",
  focusSignal,
  collapsed = false,
  onCollapsedActivate,
  className = "",
  variant = "standard",
}: SearchBarProps) {
  const { theme } = useSettings();
  const isLightMode = theme === "light";
  const [isExpanded, setIsExpanded] = useState(false);
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const showInput = !collapsed && (isExpanded || searchQuery !== "");

  const focusInput = useCallback(() => {
    setIsExpanded(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  const handleContainerClick = () => {
    if (collapsed) {
      onCollapsedActivate?.();
      return;
    }

    focusInput();
  };

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

  useEffect(() => {
    if (focusSignal === undefined) return;
    focusInput();
  }, [focusInput, focusSignal]);

  const isPremium = variant === "premium";
  const premiumChromeStyle = isPremium
    ? {
        background: isLightMode
          ? "linear-gradient(180deg, rgba(255,255,255,0.86), rgba(241,245,249,0.76))"
          : "linear-gradient(180deg, rgba(15,23,42,0.62), rgba(2,6,23,0.46))",
        backdropFilter: "blur(24px) saturate(150%)",
        WebkitBackdropFilter: "blur(24px) saturate(150%)",
        isolation: "isolate" as const,
      }
    : undefined;
  const premiumChromeClass = isLightMode
    ? "flex w-full items-center h-9 min-h-[2.25rem] rounded-xl border border-slate-300/80 overflow-hidden focus-within:border-sky-500/45 focus-within:ring-2 focus-within:ring-sky-300/12 transition-all shadow-[0_10px_26px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.86)] group relative duration-300 px-3 pr-2.5"
    : "flex w-full items-center h-9 min-h-[2.25rem] rounded-xl border border-white/18 overflow-hidden focus-within:border-sky-200/45 focus-within:ring-2 focus-within:ring-sky-300/12 transition-all shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(15,23,42,0.42)] group relative duration-300 px-3 pr-2.5";
  const premiumIconFilter = isLightMode
    ? "brightness(0) saturate(100%) invert(32%) sepia(13%) saturate(862%) hue-rotate(176deg) brightness(91%) contrast(86%)"
    : undefined;

  return (
    <motion.div
      ref={searchBarRef}
      style={premiumChromeStyle}
      className={isPremium ? `${premiumChromeClass} ${className}` : `control-bar-container search-bar group relative transition-[width,padding,color,background,border-color] duration-300 overflow-hidden ${
        showInput ? "search-bar-expanded" : ""
      } ${showInput ? "search-bar-has-input" : "search-bar-icon-only"} ${collapsed ? "search-bar-collapsed" : ""} ${className}`}
      onClick={handleContainerClick}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
      }}
    >
      <span
        className={
          isPremium
            ? "search-bar-icon-slot absolute left-3 top-1/2 flex -translate-y-1/2 shrink-0 items-center justify-center opacity-40 transition-opacity group-focus-within:opacity-80"
            : "search-bar-icon-slot flex shrink-0 items-center justify-center"
        }
        title={searchTitle}
      >
        <img
          src={searchIcon}
          alt="Search Icon"
          className="search-bar-icon icon"
          style={isPremium ? { filter: premiumIconFilter } : undefined}
        />
      </span>
      {showInput && (
        <>
          <motion.div
            key="search-input"
            className={`search-input-wrap flex min-w-0 flex-1 items-center shrink-0 whitespace-nowrap ${isPremium ? "pl-7" : ""}`}
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onBlur={() => setIsExpanded(false)}
              className={`w-full min-w-0 outline-none bg-transparent ${isPremium ? isLightMode ? "text-[12px] text-slate-900 placeholder:text-slate-500 font-sans" : "text-[12px] text-slate-100 placeholder:text-slate-500 font-sans" : ""}`}
              title={inputTitle}
            />
          </motion.div>
          <motion.img
            key="search-clear"
            src={xIcon}
            alt="Clear Search Icon"
            className={`search-bar-clear w-3 h-3 shrink-0 icon ${isPremium ? "opacity-40 hover:opacity-80 transition-opacity" : ""}`}
            aria-hidden={searchQuery === ""}
            style={{
              cursor: searchQuery !== "" ? "pointer" : "default",
              filter: isPremium ? premiumIconFilter : undefined,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: searchQuery !== "" ? (isPremium ? 0.4 : 1) : 0 }}
            onMouseDown={(event) => {
              event.preventDefault();
            }}
            onClick={() => {
              setSearchQuery("");
              focusInput();
            }}
            title="Clear Search"
          />
        </>
      )}
    </motion.div>
  );
}
