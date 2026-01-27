import { useEffect, useState } from "react";
import brandLight from "@/assets/images/brand_light.png";
import brandDark from "@/assets/images/brand_dark.png";

export function useBrandImage() {
  const computeBrand = () => {
    const theme = document.documentElement.getAttribute("data-theme");
    const contrast = document.documentElement.getAttribute("data-contrast");
    
    if (contrast === "bw") {
      return brandDark;
    }
    return theme === "light" ? brandLight : brandDark;
  };

  const [brandImg, setBrandImg] = useState<string>(computeBrand());

  useEffect(() => {
    const updateBrand = () => setBrandImg(computeBrand());

    // Apply immediately in case theme changed before this component mounted
    updateBrand();

    // Listen for theme changes dispatched by SettingsProvider
    window.addEventListener("appearancechange", updateBrand);

    return () => {
      window.removeEventListener("appearancechange", updateBrand);
    };
  }, []);

  return brandImg;
}
