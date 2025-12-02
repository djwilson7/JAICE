// import { localfiles } from "@/directory/path/to/localimport";

import { useNavigate } from "react-router";
import { LandingForm } from "@/pages/landing/landing-components/LandingForm";
import Button from "@/global-components/button";
import { useBrandImage } from "@/global-services/useBrandImage";

export function LandingPage() {
  const navigate = useNavigate();
  const brandImg = useBrandImage();

  return (
    <div
      className="flex flex-col fixed inset-0 md:flex-row overflow-auto landing-gradient"
    >
    
      {/* *Top Container */}
      <div className="flex w-full px-[2rem] py-[4rem] items-center justify-center">
        {/* Inner Container */}
        <div className="flex flex-col items-center gap-5 p-8 justify-center">
          <div className="w-120 h-120">
            <img src={brandImg} className="fit-cover" />
          </div>
          <div className="text-left">
            <h1 className="primary-text">Job Application Intelligence</h1>
            <h1 className="primary-text">& Career Enhancement</h1>
          </div>
          <h2 className="secondary-text">Simplify Your Job Hunt</h2>
        </div>
      </div>

      {/* *Form Container */}
      <div className="flex w-full px-[2rem] py-[4rem] items-center justify-center">
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
