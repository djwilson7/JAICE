import { useEffect, useState } from "react";
import brandLight from "@/assets/images/brand_light.png";
import brandDark from "@/assets/images/brand_dark.png";

export function useBrandImage() {
  // Initial read from DOM
  const initialTheme =
    document.documentElement.getAttribute("data-theme") === "light";

  const [brandImg, setBrandImg] = useState<string>(
    initialTheme ? brandLight : brandDark
  );

  useEffect(() => {
    const updateBrand = () => {
      const theme = document.documentElement.getAttribute("data-theme");
      setBrandImg(theme === "light" ? brandLight : brandDark);
    };

    // Apply immediately in case theme changed before this component mounted
    updateBrand();

    // Listen for theme changes dispatched by SettingsProvider
    window.addEventListener("themechange", updateBrand);
    return () => window.removeEventListener("themechange", updateBrand);
  }, []);

  return brandImg;
}
