import { useNavigate } from "react-router";
import Button from "@/global-components/button";
import { useBrandImage } from "@/global-services/useBrandImage";

type AboutPageProps = {
  variant?: "public" | "authenticated";
};

const features = [
  {
    title: "Track each opportunity",
    copy: "Keep applications grouped by stage, from applied to interview to offer.",
  },
  {
    title: "See what changed",
    copy: "Use the dashboard to understand progress, timing, and recent activity.",
  },
  {
    title: "Catch what needs review",
    copy: "Review flags help surface uncertain imports, missed follow-ups, and stale entries.",
  },
  {
    title: "Decide with context",
    copy: "AI-assisted signals add context without taking control away from the user.",
  },
];

const team = [
  { name: "Dontai", role: "Developer", avatar: "/team/Dontai.png" },
  { name: "Maya", role: "Developer", avatar: "/team/MayaPicture.jpg" },
  { name: "Antonio", role: "Developer", avatar: "/team/antonio.JPG" },
  { name: "Sephen", role: "Developer", avatar: "/team/Sephen.jpg" },
];

export function AboutPage({ variant = "public" }: AboutPageProps) {
  const navigate = useNavigate();
  const brandImg = useBrandImage();
  const showPublicNavigation = variant === "public";
  const isAuthenticated = variant === "authenticated";
  const pageBackgroundClass =
    variant === "public" ? "landing-gradient" : "page-gradient";
  const pageVariantClass = isAuthenticated
    ? "about-page--authenticated"
    : "about-page--public";

  return (
    <div
      className={`about-page ${pageVariantClass} ${pageBackgroundClass}`}
    >
      {showPublicNavigation && (
        <div className="about-public-nav-action">
          <Button
            className="route-text-button"
            onClick={() => navigate("/")}
          >
            Home
          </Button>
        </div>
      )}

      <main className="about-shell">
        <section className="about-hero about-surface">
          <div className="about-hero-copy">
            <p className="about-eyebrow secondary-text">About JAICE</p>
            <h1 className="about-title primary-text">JAICE</h1>
            <p className="about-lede secondary-text">
              Job Application Intelligence & Career Enhancement (JAICE), is a
              workspace for turning scattered job-search updates into a clear
              application pipeline. It helps users track where they applied,
              what changed, and what needs a follow-up.
            </p>
          </div>

          <div className="about-brand-mark">
            <img
              src={brandImg}
              alt="JAICE logo"
              className="about-brand-image"
              draggable={false}
            />
          </div>
        </section>

        <section className="about-section about-surface">
          <div className="about-section-heading">
            <p className="about-eyebrow secondary-text">
              What is JAICE
            </p>
            <h2 className="about-section-title primary-text">
              A clearer application workflow
            </h2>
            <p className="about-copy secondary-text">
              JAICE is built around the practical work of searching: collecting
              applications, keeping status current, and making sure important
              follow-ups do not disappear into scattered notes.
            </p>
          </div>

          <div className="about-feature-grid">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="about-feature-item"
              >
                <h3 className="about-feature-title primary-text">
                  {feature.title}
                </h3>
                <p className="about-feature-copy secondary-text">
                  {feature.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-purpose about-surface">
          <div>
            <p className="about-eyebrow secondary-text">
              Our Purpose
            </p>
            <h2 className="about-section-title primary-text">
              Job searching should feel less scattered
            </h2>
          </div>
          <p className="about-copy secondary-text">
            Tracking job applications manually usually means chasing updates
            across job boards, company portals, calendars, spreadsheets, and
            inboxes. JAICE focuses on email because that is where status changes,
            recruiter messages, follow-ups, and unseen opportunities often show
            up first. By processing the source where those signals already land,
            JAICE helps users see who reached out, where to follow up, and which
            applications need attention before they get buried.
          </p>
        </section>

        <section className="about-section about-surface">
          <div className="about-section-heading">
            <p className="about-eyebrow secondary-text">
              Meet the Devs
            </p>
            <h2 className="about-section-title primary-text">
              Built by a small developer team
            </h2>
            <p className="about-copy secondary-text">
              As recent graduates and college students, we know the job hunt is
              more than a numbers game. It often means balancing job boards,
              email threads, calendar reminders, and notes while trying not to
              miss the next real opportunity. JAICE is built from that experience.
            </p>
          </div>

          <div className="about-team-grid">
            {team.map((member) => (
              <article
                key={member.name}
                tabIndex={0}
                className="about-team-card group"
              >
                <div className="about-team-image-wrap">
                  <img
                    src={member.avatar}
                    alt={`${member.name}, ${member.role}`}
                    className="about-team-image"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="about-team-meta">
                  <h3 className="about-team-name primary-text">
                    {member.name}
                  </h3>
                  <p className="about-team-role secondary-text">{member.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default AboutPage;
