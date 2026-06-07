// import { localfiles } from "@/directory/path/to/localimport";

import { useNavigate } from "react-router";
import { LandingForm } from "@/pages/landing/landing-components/LandingForm";
import Button from "@/global-components/button";
import { useBrandImage } from "@/global-services/useBrandImage";

export function LandingPage() {
  const navigate = useNavigate();
  const brandImg = useBrandImage();

  return (
    <div className="landing-page landing-gradient">
      <section className="landing-brand-section">
        <div className="landing-brand-stack">
          <div className="landing-brand-image">
            <img src={brandImg} alt="JAICE" />
          </div>
          <div className="landing-brand-copy">
            <h1 className="primary-text">Job Application Intelligence</h1>
            <h1 className="primary-text">& Career Enhancement</h1>
          </div>
          <h2 className="landing-brand-slogan secondary-text">
            Simplify Your Job Hunt
          </h2>
        </div>
      </section>

      <section className="landing-form-section">
        <div className="landing-form-wrap">
          <LandingForm />
        </div>
      </section>

      <div className="landing-about-action">
        <Button
          className="route-text-button"
          onClick={() => navigate("/about")}
        >
          About
        </Button>
      </div>
    </div>
  );
}
