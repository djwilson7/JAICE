// import { localfiles } from "@/directory/path/to/localimport";

import { useNavigate } from "react-router";
import { LandingForm } from "@/pages/landing/landing-components/LandingForm";
import Button from "@/global-components/button";
import brandDark from "@/assets/images/brand_dark.png";
import brandLight from "@/assets/images/brand_light.png";
import { useEffect, useState } from "react";

export function LandingPage() {
  const navigate = useNavigate();
  
  const initialTheme = document.documentElement.getAttribute("data-theme") === "light";
  const [brandImg, setBrandImg] = useState<string>(initialTheme ? brandLight : brandDark);

  useEffect(() => {
    const updateBrand = () => {
      const htmlTheme = document.documentElement.getAttribute("data-theme");
      setBrandImg(htmlTheme === "light" ? brandLight : brandDark);
    };
    updateBrand();
    window.addEventListener("themechange", updateBrand);
    return () => window.removeEventListener("themechange", updateBrand);
  }, []);
  return (
    <div
      className="flex flex-col gap-10 min-h-screen p-[2rem] md:flex-row overflow-auto"
      style={{ background: "var(--color-bg-alt)" }}
    >
      {/* *Top Container */}
      <div className="flex w-full px-[2rem] py-[4rem] items-center justify-center">
        {/* Inner Container */}
        <div className="flex flex-col items-center gap-5 p-8 justify-center">
          <div className="w-120 h-120">
            <img src={brandImg} className="fit-cover" />
          </div>
          <div className="text-left">
            <h1>Job Application Intelligence</h1>
            <h1>& Career Enhancement</h1>
          </div>
          <h2>Simplify Your Job Hunt</h2>
        </div>
      </div>

      {/* *Form Container */}
      <div className="flex w-full  px-[2rem] py-[4rem] items-center justify-center">
        {/* Inner Container */}
        <div className="flex flex-col w-[30rem]">
          <LandingForm />
        </div>
      </div>

      {/* *Floating Button Container */}
      <div className="fixed top-0 left-0 m-4">
        <Button onClick={() => navigate("/about")}>About</Button>
      </div>
    </div>
  );
}
