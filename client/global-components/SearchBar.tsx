import searchIcon from "@/assets/icons/search.svg";
import circleXIcon from "@/assets/icons/circle-xmark.svg";
import { motion } from "framer-motion";
import { getCSSVar } from "@/utils/getCSSVar";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/pages/settings/provider/SettingsProvider";

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
  inputTitle = "Search by job title, company, or dates.",
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
    setIsExpanded(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [focusSignal]);

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
      } ${collapsed ? "search-bar-collapsed" : ""} ${className}`}
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
        className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 shrink-0 icon ${isPremium ? "opacity-40 group-focus-within:opacity-80 transition-opacity" : ""}`}
        style={isPremium ? { filter: premiumIconFilter } : undefined}
        title={searchTitle}
        onClick={() => {
          if (collapsed) {
            onCollapsedActivate?.();
            return;
          }
          setIsExpanded(true);
        }}
      />
      <motion.div
        key="search-input"
        className={`search-input-wrap flex min-w-0 flex-1 items-center transition-opacity duration-150 shrink-0 whitespace-nowrap ${isPremium ? "pl-7" : "pl-6"} ${
          collapsed ? "opacity-0" : "opacity-100"
        }`}
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
        src={circleXIcon}
        alt="Clear Search Icon"
        className={`w-4 h-4 shrink-0 icon ${isPremium ? "opacity-40 hover:opacity-80 transition-opacity" : ""}`}
        aria-hidden={searchQuery === ""}
        style={{
          cursor: searchQuery !== "" ? "pointer" : "default",
          opacity: searchQuery !== "" ? (isPremium ? 0.4 : 1) : 0,
          filter: isPremium ? premiumIconFilter : undefined,
        }}
        animate={{opacity: searchQuery !== "" ? (isPremium ? 0.4 : 1) : 0}}
        onClick={() => {
          setSearchQuery("");
          setIsExpanded(false);
        }}
        title="Clear Search"
      />
    </motion.div>
  );
}
