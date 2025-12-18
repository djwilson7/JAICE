import sunIcon from "@/assets/icons/sun.svg";
import moonIcon from "@/assets/icons/moon.svg";
import halfCircleIcon from "@/assets/icons/half-circle.svg";
import loadingAnimationDark from "@/assets/loaders/CircleVenn.json";
import loadingAnimationLight from "@/assets/loaders/CircleVennLight.json";
import loadingAnimationBW from "@/assets/loaders/CircleVennBW.json";

import { useEffect, useState } from "react";

const themeData = {
    light: { icon: sunIcon, label: "Light Mode", title: "Flip to Dark Mode", loadingAnimation: loadingAnimationLight },
    dark: { icon: moonIcon, label: "Dark Mode", title: "Flip to Light Mode", loadingAnimation: loadingAnimationDark },
    bw: { icon: halfCircleIcon, label: "B/W Contrast Mode", title: "Flip to Dark Mode", loadingAnimation: loadingAnimationBW }
}

interface ThemeData {
    icon: string;
    label: string;
    title: string;
    loadingAnimation: any;
}

export function getThemeData() {

  const computeThemeIcon = () => {
    const theme = document.documentElement.getAttribute("data-theme");
    const contrast = document.documentElement.getAttribute("data-contrast");
    if (contrast === "bw") {
      return themeData.bw;
    }
    return theme === "light" ? themeData.light : themeData.dark;
  };

  const [theme, setTheme] = useState<ThemeData>(computeThemeIcon());

  useEffect(() => {
    const updateIcon = () => setTheme(computeThemeIcon());

    updateIcon();

    window.addEventListener("appearancechange", updateIcon);

    return () => {
      window.removeEventListener("appearancechange", updateIcon);
    };
  }, []);

  return theme;
}