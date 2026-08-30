// import { localfiles } from "@/directory/path/to/localimport";

import { lazy, Suspense } from "react";
import { useNavigate } from "react-router";
import Button from "@/global-components/button";
import { useBrandImage } from "@/global-services/useBrandImage";
import {
  PROJECT_MODE,
  PROJECT_MODES,
  type ProjectMode,
} from "@/global-services/projectMode";

const LandingForm = lazy(async () => {
  const module = await import(
    "@/pages/landing/landing-components/LandingForm"
  );
  return { default: module.LandingForm };
});

type LandingPageProps = {
  projectMode?: ProjectMode;
};

function DemoWorkflowVisuals() {
  return (
    <section className="demo-tour-story" aria-labelledby="demo-tour-story-title">
      <div className="demo-tour-story-heading">
        <p>From inbox to action</p>
        <h2 id="demo-tour-story-title">Track your progress, not your inbox.</h2>
      </div>

      <div className="demo-tour-visual-grid">
        <article className="demo-tour-card demo-tour-card--ingest">
          <div className="demo-tour-card-copy">
            <h3>Sync your emails</h3>
            <p>Drop the noise</p>
          </div>

          <div className="demo-tour-card-visual-slot">
            <div className="demo-email-visual" aria-hidden="true">
              <div className="demo-email-inbox-heading">
                <span>Inbox review</span>
                <strong>3 signals</strong>
              </div>
              <div className="demo-email-row demo-email-row--noise">
                <div>
                  <strong>Weekend sale ends tonight</strong>
                  <span>Promotional email</span>
                </div>
                <b>×</b>
              </div>
              <div className="demo-email-row demo-email-row--signal">
                <div>
                  <strong>Application received</strong>
                  <span>Application confirmation</span>
                </div>
                <b>✓</b>
              </div>
              <div className="demo-email-row demo-email-row--noise">
                <div>
                  <strong>Your weekly newsletter</strong>
                  <span>Subscription update</span>
                </div>
                <b>×</b>
              </div>
              <div className="demo-email-row demo-email-row--signal">
                <div>
                  <strong>Interview availability</strong>
                  <span>Recruiter reply</span>
                </div>
                <b>✓</b>
              </div>
              <div className="demo-email-row demo-email-row--signal">
                <div>
                  <strong>Application status update</strong>
                  <span>Hiring team update</span>
                </div>
                <b>✓</b>
              </div>
            </div>
          </div>
          <p className="demo-tour-card-result">Keep the signal</p>
        </article>

        <article className="demo-tour-card demo-tour-card--board">
          <div className="demo-tour-card-copy">
            <h3>Sort your mail</h3>
            <p>Organized by stage</p>
          </div>

          <div className="demo-tour-card-visual-slot">
            <div className="demo-stage-visual" aria-hidden="true">
              <div className="demo-stage-column">
                <div className="demo-stage-heading">
                  <span>Applied</span>
                  <b>2</b>
                </div>
                <div className="demo-stage-email-card">
                  <i />
                  <strong>Application received</strong>
                  <span>Application confirmation</span>
                </div>
                <div className="demo-stage-email-card demo-stage-email-card--existing">
                  <i />
                  <strong>Thanks for applying</strong>
                  <span>Captured Monday</span>
                </div>
              </div>
              <div className="demo-stage-column">
                <div className="demo-stage-heading">
                  <span>Interview</span>
                  <b>1</b>
                </div>
                <div className="demo-stage-email-card demo-stage-email-card--active">
                  <i />
                  <strong>Interview availability</strong>
                  <span>Recruiter reply</span>
                </div>
              </div>
              <div className="demo-stage-column">
                <div className="demo-stage-heading">
                  <span>Next step</span>
                  <b>2</b>
                </div>
                <div className="demo-stage-email-card demo-stage-email-card--next">
                  <i />
                  <strong>Application status update</strong>
                  <span>Hiring team update</span>
                </div>
                <div className="demo-stage-email-card demo-stage-email-card--existing">
                  <i />
                  <strong>Follow-up reminder</strong>
                  <span>Response window detected</span>
                </div>
              </div>
            </div>
          </div>
          <p className="demo-tour-card-result">Prioritized by effort</p>
        </article>

        <article className="demo-tour-card demo-tour-card--review">
          <div className="demo-tour-card-copy">
            <h3>Status updates</h3>
            <p>Updates sync</p>
          </div>

          <div className="demo-tour-card-visual-slot">
            <div className="demo-update-visual" aria-hidden="true">
              <div>
                <i />
                <span>
                  <strong>New application captured</strong>
                  <small>Source email saved</small>
                </span>
                <b>09:42</b>
              </div>
              <div>
                <i />
                <span>
                  <strong>Interview date detected</strong>
                  <small>Ready for review</small>
                </span>
                <b>10:18</b>
              </div>
              <div>
                <i />
                <span>
                  <strong>Follow-up flagged</strong>
                  <small>Linked to original thread</small>
                </span>
                <b>11:06</b>
              </div>
            </div>
          </div>
          <p className="demo-tour-card-result">Even at 3am</p>
        </article>

        <article className="demo-tour-card demo-tour-card--analytics">
          <div className="demo-tour-card-copy">
            <h3>Stats that guide you</h3>
            <p>See what works</p>
          </div>

          <div className="demo-tour-card-visual-slot">
            <div className="demo-analytics-visual" aria-hidden="true">
              <div className="demo-analytics-metric">
                <span>Updates this week</span>
                <strong>Recruiter responses</strong>
              </div>
              <div className="demo-analytics-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="demo-analytics-legend">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
              </div>
            </div>
          </div>
          <p className="demo-tour-card-result">Focus your effort</p>
        </article>
      </div>
    </section>
  );
}

function DemoLandingPage({
  brandImg,
  onOpenProduct,
}: {
  brandImg: string;
  onOpenProduct: () => void;
}) {
  return (
    <div className="landing-page landing-page--demo landing-gradient">
      <img
        className="demo-tour-watermark"
        src={brandImg}
        alt=""
        aria-hidden="true"
      />
      <header className="demo-landing-header">
        <span className="demo-landing-name primary-text">JAICE</span>
        <Button
          className="demo-landing-cta"
          onClick={onOpenProduct}
          title="Take a guided tour of JAICE"
        >
          Take a guided tour
          <span aria-hidden="true">↗</span>
        </Button>
      </header>

      <main className="demo-landing-main">
        <section className="demo-landing-hero">
          <div className="demo-landing-copy">
            <h1>
              <span>Simplify</span>
              <span>Your Job Hunt</span>
            </h1>
          </div>

          <div className="demo-hero-support">
            <div className="demo-hero-pressure">
              <h2>Never lose track of what comes next.</h2>
            </div>

            <div
              className="demo-hero-flow demo-hero-flow--pipeline"
              aria-label="Emails flow through JAICE into next steps"
            >
              <div className="demo-hero-flow-card--outer">
                <strong>Emails</strong>
                <span>Confirmations, replies, updates</span>
              </div>
              <i aria-hidden="true" />
              <div className="demo-hero-flow-jaice">
                <strong>JAICE</strong>
                <span>Connects every signal</span>
              </div>
              <i aria-hidden="true" />
              <div className="demo-hero-flow-card--outer">
                <strong>Next steps</strong>
                <span>Review, follow up, move</span>
              </div>
            </div>
          </div>
        </section>

        <DemoWorkflowVisuals />
      </main>
    </div>
  );
}

export function LandingPage({ projectMode = PROJECT_MODE }: LandingPageProps) {
  const navigate = useNavigate();
  const brandImg = useBrandImage();
  const isDemoMode = projectMode === PROJECT_MODES.demo;

  if (isDemoMode) {
    return (
      <DemoLandingPage
        brandImg={brandImg}
        onOpenProduct={() => navigate("/home")}
      />
    );
  }

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
          <Suspense fallback={null}>
            <LandingForm />
          </Suspense>
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
