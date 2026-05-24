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

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ background: "var(--primary-gradient)" }}
    >
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-4 py-8 md:gap-18 md:px-8 md:py-14">
        <section className="grid items-center gap-8 border-b border-white/10 pb-10 md:grid-cols-[minmax(0,1fr)_auto] md:pb-14">
          <div className="text-left">
            <h1 className="primary-text mt-3 text-5xl font-bold md:text-7xl">
              JAICE
            </h1>
            <p className="secondary-text mt-5 max-w-2xl text-base leading-relaxed md:text-lg">
              Job Application Intelligence & Career Enhancement (JAICE), is a
              workspace for turning scattered job-search updates into a clear
              application pipeline. It helps users track where they applied,
              what changed, and what needs a follow-up.
            </p>

            {showPublicNavigation && (
              <div className="mt-6 w-fit">
                <Button onClick={() => navigate("/")}>Home</Button>
              </div>
            )}
          </div>

          <div className="flex justify-center md:justify-end">
            <img
              src={brandImg}
              alt="JAICE logo"
              className="h-36 w-auto select-none object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.28)] md:h-52"
              draggable={false}
            />
          </div>
        </section>

        <section className="space-y-6 border-b border-white/10 pb-10 text-left md:pb-14">
          <div>
            <p className="secondary-text text-sm font-semibold uppercase tracking-wide">
              What is JAICE
            </p>
            <h2 className="primary-text mt-2 text-2xl font-semibold md:text-3xl">
              A clearer application workflow
            </h2>
            <p className="secondary-text mt-3 max-w-3xl text-base leading-relaxed">
              JAICE is built around the practical work of searching: collecting
              applications, keeping status current, and making sure important
              follow-ups do not disappear into scattered notes.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-md border border-white/10 bg-white/5 p-4 shadow-sm"
              >
                <h3 className="primary-text text-base font-semibold">
                  {feature.title}
                </h3>
                <p className="secondary-text mt-2 text-sm leading-relaxed">
                  {feature.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 border-b border-white/10 pb-10 text-left lg:grid-cols-[0.75fr_1fr] lg:items-start md:pb-14">
          <div>
            <p className="secondary-text text-sm font-semibold uppercase tracking-wide">
              Our Purpose
            </p>
            <h2 className="primary-text mt-2 text-2xl font-semibold md:text-3xl">
              Job searching should feel less scattered
            </h2>
          </div>
          <p className="secondary-text max-w-3xl text-base leading-relaxed">
            Tracking job applications manually usually means chasing updates
            across job boards, company portals, calendars, spreadsheets, and
            inboxes. JAICE focuses on email because that is where status changes,
            recruiter messages, follow-ups, and unseen opportunities often show
            up first. By processing the source where those signals already land,
            JAICE helps users see who reached out, where to follow up, and which
            applications need attention before they get buried.
          </p>
        </section>

        <section className="space-y-6 text-left">
          <div>
            <p className="secondary-text text-sm font-semibold uppercase tracking-wide">
              Meet the Devs
            </p>
            <h2 className="primary-text mt-2 text-2xl font-semibold md:text-3xl">
              Built by a small developer team
            </h2>
            <p className="secondary-text mt-3 max-w-3xl text-base leading-relaxed">
              As recent graduates and college students, we know the job hunt is
              more than a numbers game. It often means balancing job boards,
              email threads, calendar reminders, and notes while trying not to
              miss the next real opportunity. JAICE is built from that experience.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {team.map((member) => (
              <article
                key={member.name}
                tabIndex={0}
                className="group overflow-hidden rounded-md border border-white/10 bg-white/5 shadow-sm transition-colors duration-200 hover:border-white/25 focus:outline-none focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/45"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-black/15">
                  <img
                    src={member.avatar}
                    alt={`${member.name}, ${member.role}`}
                    className="h-full w-full object-cover grayscale transition duration-300 ease-out group-hover:scale-[1.02] group-hover:grayscale-0 group-focus-visible:scale-[1.02] group-focus-visible:grayscale-0"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-4">
                  <h3 className="primary-text text-base font-semibold">
                    {member.name}
                  </h3>
                  <p className="secondary-text mt-1 text-sm">{member.role}</p>
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
