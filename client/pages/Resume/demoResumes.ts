import { defaultResumeFormatting } from "./formatting";
import type { ResumeData, ResumeTag, SavedResume } from "./types";

type DemoResumeKind = "full-stack" | "frontend" | "backend";

const CONTACT = {
  fullName: "QUALIFIED CANDIDATE",
  email: "candidate@example.com",
  phone: "(555) 010-2048",
  location: "Austin, TX",
  website: "portfolio.example",
  linkedin: "linkedin.com/in/qualified-candidate",
  github: "github.com/qualified-candidate",
};

const EDUCATION = [
  {
    id: "demo-education-state-university",
    school: "State University",
    degree: "B.S. Computer Science",
    startDate: "Aug 2014",
    endDate: "May 2018",
    details: [],
  },
];

const DEMO_TAG_CREATED_AT = "2026-01-15T12:00:00.000Z";
const DEMO_TAG_LIBRARY: ResumeTag[] = [
  { id: "demo-tag-workflows", name: "Workflows", slug: "workflows", colorToken: "tag-blue", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-scalability", name: "Scalability", slug: "scalability", colorToken: "tag-purple", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-delivery", name: "Delivery", slug: "delivery", colorToken: "tag-emerald", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-engagement", name: "Engagement", slug: "engagement", colorToken: "tag-orange", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-performance", name: "Performance", slug: "performance", colorToken: "tag-cyan", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-accessibility", name: "Accessibility", slug: "accessibility", colorToken: "tag-violet", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-design", name: "Design", slug: "design", colorToken: "tag-pink", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-quality", name: "Quality", slug: "quality", colorToken: "tag-amber", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-reliability", name: "Reliability", slug: "reliability", colorToken: "tag-rose", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-observability", name: "Observability", slug: "observability", colorToken: "tag-fuchsia", createdAt: DEMO_TAG_CREATED_AT },
  { id: "demo-tag-pipelines", name: "Pipelines", slug: "pipelines", colorToken: "tag-teal", createdAt: DEMO_TAG_CREATED_AT },
];

const VERSION_CONTENT: Record<
  DemoResumeKind,
  Pick<ResumeData, "summary" | "experience" | "skills">
> = {
  "full-stack": {
    summary:
      "Full stack software engineer with 7+ years of experience building reliable web products from accessible user interfaces through scalable APIs and data services. Experienced in TypeScript, React, Node.js, Python, PostgreSQL, cloud infrastructure, and cross-functional delivery.",
    experience: [
      {
        id: "demo-experience-northstar",
        jobTitle: "Senior Software Engineer",
        company: "Northstar Labs",
        location: "Austin, TX",
        startDate: "Mar 2021",
        endDate: "Present",
        bullets: [
          {
            id: "demo-northstar-fullstack-1",
            text: "Delivered customer-facing workflows across React, TypeScript, Node.js, and PostgreSQL, reducing task completion time by 28% for more than 40,000 monthly users.",
            tagIds: ["demo-tag-workflows"],
          },
          {
            id: "demo-northstar-fullstack-2",
            text: "Designed versioned APIs and asynchronous processing services that supported a 3x increase in daily traffic while maintaining 99.95% availability.",
            tagIds: ["demo-tag-scalability"],
          },
          {
            id: "demo-northstar-fullstack-3",
            text: "Partnered with product, design, and platform engineers to plan releases, improve automated coverage, and shorten lead time by 24%.",
            tagIds: ["demo-tag-delivery"],
          },
        ],
      },
      {
        id: "demo-experience-harbor",
        jobTitle: "Software Engineer",
        company: "Harbor Systems",
        location: "Remote",
        startDate: "Jun 2018",
        endDate: "Feb 2021",
        bullets: [
          {
            id: "demo-harbor-fullstack-1",
            text: "Built and maintained responsive product features with React and REST services, helping increase weekly active use by 18%.",
            tagIds: ["demo-tag-engagement"],
          },
          {
            id: "demo-harbor-fullstack-2",
            text: "Improved SQL queries, caching, and application monitoring to cut median response time by 35% and reduce recurring incidents.",
            tagIds: ["demo-tag-performance"],
          },
        ],
      },
    ],
    skills: [
      {
        id: "demo-skills-fullstack-languages",
        category: "Languages",
        items: ["TypeScript", "JavaScript", "Python", "SQL"],
      },
      {
        id: "demo-skills-fullstack-frameworks",
        category: "Frameworks",
        items: ["React", "Node.js", "FastAPI", "Express"],
      },
      {
        id: "demo-skills-fullstack-platform",
        category: "Platform & Data",
        items: ["PostgreSQL", "Redis", "AWS", "Docker", "CI/CD"],
      },
    ],
  },
  frontend: {
    summary:
      "Frontend software engineer with 7+ years of experience creating accessible, responsive web applications with React and TypeScript. Skilled in design systems, performance optimization, component architecture, automated testing, and close partnership with product and design teams.",
    experience: [
      {
        id: "demo-experience-northstar",
        jobTitle: "Senior Software Engineer",
        company: "Northstar Labs",
        location: "Austin, TX",
        startDate: "Mar 2021",
        endDate: "Present",
        bullets: [
          {
            id: "demo-northstar-frontend-1",
            text: "Led development of React and TypeScript workflows used by more than 40,000 people monthly, reducing task completion time by 28%.",
            tagIds: ["demo-tag-workflows"],
          },
          {
            id: "demo-northstar-frontend-2",
            text: "Created an accessible component library and shared interaction patterns that increased feature delivery speed by 30% across four product teams.",
            tagIds: ["demo-tag-accessibility"],
          },
          {
            id: "demo-northstar-frontend-3",
            text: "Reduced initial page load by 42% through route-level code splitting, asset optimization, and targeted rendering improvements.",
            tagIds: ["demo-tag-performance"],
          },
        ],
      },
      {
        id: "demo-experience-harbor",
        jobTitle: "Software Engineer",
        company: "Harbor Systems",
        location: "Remote",
        startDate: "Jun 2018",
        endDate: "Feb 2021",
        bullets: [
          {
            id: "demo-harbor-frontend-1",
            text: "Built responsive product experiences from design prototypes using React, modern CSS, and reusable state-management patterns.",
            tagIds: ["demo-tag-design"],
          },
          {
            id: "demo-harbor-frontend-2",
            text: "Expanded unit and browser-test coverage for critical customer journeys, lowering escaped interface defects by 33%.",
            tagIds: ["demo-tag-quality"],
          },
        ],
      },
    ],
    skills: [
      {
        id: "demo-skills-frontend-core",
        category: "Frontend",
        items: ["React", "TypeScript", "JavaScript", "HTML", "CSS"],
      },
      {
        id: "demo-skills-frontend-quality",
        category: "Quality & UX",
        items: ["Accessibility", "Design Systems", "Vitest", "Playwright"],
      },
      {
        id: "demo-skills-frontend-tools",
        category: "Tools",
        items: ["Vite", "Storybook", "Figma", "Git", "CI/CD"],
      },
    ],
  },
  backend: {
    summary:
      "Backend software engineer with 7+ years of experience designing dependable APIs, event-driven services, and data-intensive systems. Skilled in Node.js, Python, PostgreSQL, distributed processing, observability, cloud infrastructure, and production reliability.",
    experience: [
      {
        id: "demo-experience-northstar",
        jobTitle: "Senior Software Engineer",
        company: "Northstar Labs",
        location: "Austin, TX",
        startDate: "Mar 2021",
        endDate: "Present",
        bullets: [
          {
            id: "demo-northstar-backend-1",
            text: "Designed Node.js and PostgreSQL services that supported a 3x increase in daily traffic while maintaining 99.95% availability.",
            tagIds: ["demo-tag-scalability"],
          },
          {
            id: "demo-northstar-backend-2",
            text: "Introduced queue-based processing, idempotent consumers, and retry controls that reduced failed background jobs by 71%.",
            tagIds: ["demo-tag-reliability"],
          },
          {
            id: "demo-northstar-backend-3",
            text: "Implemented service-level dashboards and distributed tracing, cutting median production diagnosis time from 50 minutes to 18 minutes.",
            tagIds: ["demo-tag-observability"],
          },
        ],
      },
      {
        id: "demo-experience-harbor",
        jobTitle: "Software Engineer",
        company: "Harbor Systems",
        location: "Remote",
        startDate: "Jun 2018",
        endDate: "Feb 2021",
        bullets: [
          {
            id: "demo-harbor-backend-1",
            text: "Developed REST APIs and scheduled data pipelines in Python, improving partner-data freshness from daily to hourly updates.",
            tagIds: ["demo-tag-pipelines"],
          },
          {
            id: "demo-harbor-backend-2",
            text: "Optimized SQL queries and Redis caching to cut median response time by 35% and stabilize peak-period performance.",
            tagIds: ["demo-tag-performance"],
          },
        ],
      },
    ],
    skills: [
      {
        id: "demo-skills-backend-languages",
        category: "Languages",
        items: ["TypeScript", "Python", "SQL"],
      },
      {
        id: "demo-skills-backend-services",
        category: "Backend",
        items: ["Node.js", "FastAPI", "Express", "REST APIs", "Queues"],
      },
      {
        id: "demo-skills-backend-platform",
        category: "Data & Platform",
        items: ["PostgreSQL", "Redis", "AWS", "Docker", "Observability"],
      },
    ],
  },
};

export function createDemoResumeData(kind: DemoResumeKind): ResumeData {
  const content = VERSION_CONTENT[kind];
  return {
    ...CONTACT,
    summary: content.summary,
    experience: structuredClone(content.experience),
    education: structuredClone(EDUCATION),
    skills: structuredClone(content.skills),
    customContact: [],
    hiddenContactFields: [],
    formatting: defaultResumeFormatting(),
    sectionTitles: {
      summary: "Professional Summary",
      experience: "Work Experience",
      education: "Education",
      skills: "Skills",
    },
    tagLibrary: structuredClone(DEMO_TAG_LIBRARY),
  };
}

export function createDemoSavedResumes(): SavedResume[] {
  const masterId = "demo-resume-full-stack";
  const createdAt = "2026-01-15T12:00:00.000Z";
  return [
    {
      id: masterId,
      name: "Full Stack Resume",
      is_master: true,
      schema_version: 1,
      source_resume_id: null,
      resume_data: createDemoResumeData("full-stack"),
      target_job_title: null,
      target_job_description: null,
      created_at: createdAt,
      updated_at: "2026-03-01T12:00:00.000Z",
    },
    {
      id: "demo-resume-frontend",
      name: "Frontend Resume",
      is_master: false,
      schema_version: 1,
      source_resume_id: masterId,
      resume_data: createDemoResumeData("frontend"),
      target_job_title: "Frontend Engineer",
      target_job_description: null,
      created_at: createdAt,
      updated_at: "2026-02-20T12:00:00.000Z",
    },
    {
      id: "demo-resume-backend",
      name: "Backend Resume",
      is_master: false,
      schema_version: 1,
      source_resume_id: masterId,
      resume_data: createDemoResumeData("backend"),
      target_job_title: "Backend Engineer",
      target_job_description: null,
      created_at: createdAt,
      updated_at: "2026-02-18T12:00:00.000Z",
    },
  ];
}
