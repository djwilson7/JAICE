import type { JobCardType } from "@/types/jobCardType";
import type { ValidColumn } from "@/types/validColumns";

export type DemoEmail = {
  id: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  preview: string;
  companyName: string;
  opportunityTitle: string;
  receivedAt: string;
  detectedStage: ValidColumn;
};

type DemoEmailBlueprint = Omit<DemoEmail, "receivedAt"> & {
  daysAgo: number;
  hour: number;
};

const EMAIL_BLUEPRINTS: readonly DemoEmailBlueprint[] = [
  {
    id: "demo-email-northstar-application",
    senderName: "Northstar Labs Recruiting",
    senderEmail: "recruiting@northstarlabs.example",
    subject: "Application received — Frontend Engineer",
    preview:
      "Thanks for applying to Northstar Labs. Our recruiting team has received your application and will review it shortly.",
    companyName: "Northstar Labs",
    opportunityTitle: "Frontend Engineer",
    detectedStage: "applied",
    daysAgo: 6,
    hour: 9,
  },
  {
    id: "demo-email-harbor-interview",
    senderName: "Maya at Harbor Health",
    senderEmail: "maya@harborhealth.example",
    subject: "Interview availability — Product Designer",
    preview:
      "We enjoyed reviewing your experience and would like to schedule a first conversation. Please share a few times that work for you.",
    companyName: "Harbor Health",
    opportunityTitle: "Product Designer",
    detectedStage: "interview",
    daysAgo: 5,
    hour: 13,
  },
  {
    id: "demo-email-cedar-assessment",
    senderName: "Cedar Analytics Talent",
    senderEmail: "talent@cedaranalytics.example",
    subject: "Next step — Data Analyst assessment",
    preview:
      "Your application is moving forward. The next step is a short skills assessment that can be completed this week.",
    companyName: "Cedar Analytics",
    opportunityTitle: "Data Analyst",
    detectedStage: "interview",
    daysAgo: 4,
    hour: 11,
  },
  {
    id: "demo-email-lumen-update",
    senderName: "Lumen Works Careers",
    senderEmail: "careers@lumenworks.example",
    subject: "An update on your Software Engineer application",
    preview:
      "Thank you for the time you invested in our process. We have decided to continue with another candidate for this opening.",
    companyName: "Lumen Works",
    opportunityTitle: "Software Engineer",
    detectedStage: "rejected",
    daysAgo: 3,
    hour: 8,
  },
  {
    id: "demo-email-juniper-offer",
    senderName: "Juniper Systems People Team",
    senderEmail: "people@junipersystems.example",
    subject: "Offer details — Support Engineer",
    preview:
      "We are excited to share the offer details for the Support Engineer position. The attached summary covers compensation and next steps.",
    companyName: "Juniper Systems",
    opportunityTitle: "Support Engineer",
    detectedStage: "offer",
    daysAgo: 2,
    hour: 15,
  },
  {
    id: "demo-email-brightline-followup",
    senderName: "Elena at Brightline Studio",
    senderEmail: "elena@brightlinestudio.example",
    subject: "Following up — UX Researcher",
    preview:
      "I wanted to follow up after our conversation. The team is finishing interviews and expects to share an update soon.",
    companyName: "Brightline Studio",
    opportunityTitle: "UX Researcher",
    detectedStage: "interview",
    daysAgo: 1,
    hour: 16,
  },
  {
    id: "demo-email-atlas-confirmation",
    senderName: "Atlas Commerce Hiring",
    senderEmail: "hiring@atlascommerce.example",
    subject: "Application confirmation — Product Manager",
    preview:
      "Your application for Product Manager is in our system. We will be in touch after the hiring team completes its initial review.",
    companyName: "Atlas Commerce",
    opportunityTitle: "Product Manager",
    detectedStage: "applied",
    daysAgo: 0,
    hour: 7,
  },
];

const EXPLORE_EMAIL_BLUEPRINTS: readonly DemoEmailBlueprint[] = [
  {
    id: "demo-explore-meridian-application",
    senderName: "Meridian Cloud Talent",
    senderEmail: "talent@meridiancloud.example",
    subject: "Application received — Platform Engineer",
    preview: "Your application is in our hiring queue and will be reviewed by the platform team.",
    companyName: "Meridian Cloud",
    opportunityTitle: "Platform Engineer",
    detectedStage: "applied",
    daysAgo: 18,
    hour: 9,
  },
  {
    id: "demo-explore-pinecone-application",
    senderName: "Pinecone Works Careers",
    senderEmail: "careers@pineconeworks.example",
    subject: "We received your Product Operations application",
    preview: "Thanks for your interest. Our operations team is reviewing your background now.",
    companyName: "Pinecone Works",
    opportunityTitle: "Product Operations Specialist",
    detectedStage: "applied",
    daysAgo: 17,
    hour: 14,
  },
  {
    id: "demo-explore-orbit-application",
    senderName: "Orbit Security Recruiting",
    senderEmail: "recruiting@orbitsecurity.example",
    subject: "Security Engineer application confirmation",
    preview: "Your application has been submitted successfully. We will share next steps soon.",
    companyName: "Orbit Security",
    opportunityTitle: "Security Engineer",
    detectedStage: "applied",
    daysAgo: 16,
    hour: 10,
  },
  {
    id: "demo-explore-vale-application",
    senderName: "Vale Customer Team",
    senderEmail: "people@vale.example",
    subject: "Application confirmed — Customer Success Manager",
    preview: "We have your application and appreciate the time you spent introducing yourself.",
    companyName: "Vale",
    opportunityTitle: "Customer Success Manager",
    detectedStage: "applied",
    daysAgo: 15,
    hour: 8,
  },
  {
    id: "demo-explore-ember-interview",
    senderName: "Ember Studio Hiring",
    senderEmail: "hiring@emberstudio.example",
    subject: "Let’s schedule your Frontend Engineer interview",
    preview: "The team enjoyed your portfolio and would like to arrange a technical conversation.",
    companyName: "Ember Studio",
    opportunityTitle: "Frontend Engineer",
    detectedStage: "interview",
    daysAgo: 14,
    hour: 11,
  },
  {
    id: "demo-explore-fieldstone-interview",
    senderName: "Fieldstone Data Recruiting",
    senderEmail: "recruiting@fieldstonedata.example",
    subject: "Next step — Data Engineer technical screen",
    preview: "Please choose a time for a technical screen with one of our data engineers.",
    companyName: "Fieldstone Data",
    opportunityTitle: "Data Engineer",
    detectedStage: "interview",
    daysAgo: 13,
    hour: 15,
  },
  {
    id: "demo-explore-kestrel-interview",
    senderName: "Kestrel Design People",
    senderEmail: "people@kestreldesign.example",
    subject: "Portfolio conversation — UX Designer",
    preview: "We would like to discuss two projects from your portfolio with the design team.",
    companyName: "Kestrel Design",
    opportunityTitle: "UX Designer",
    detectedStage: "interview",
    daysAgo: 12,
    hour: 13,
  },
  {
    id: "demo-explore-mosaic-interview",
    senderName: "Mosaic Systems Talent",
    senderEmail: "talent@mosaicsystems.example",
    subject: "Interview invitation — QA Automation Engineer",
    preview: "Your experience looks relevant to our automation work. Let’s schedule a first interview.",
    companyName: "Mosaic Systems",
    opportunityTitle: "QA Automation Engineer",
    detectedStage: "interview",
    daysAgo: 11,
    hour: 10,
  },
  {
    id: "demo-explore-tideway-interview",
    senderName: "Tideway Product Recruiting",
    senderEmail: "jobs@tideway.example",
    subject: "Final-round schedule — Technical Program Manager",
    preview: "We are ready to coordinate your final conversations with product and engineering leaders.",
    companyName: "Tideway",
    opportunityTitle: "Technical Program Manager",
    detectedStage: "interview",
    daysAgo: 10,
    hour: 16,
  },
  {
    id: "demo-explore-solace-offer",
    senderName: "Solace Developer Relations",
    senderEmail: "people@solace.example",
    subject: "Your Developer Advocate offer",
    preview: "We are excited to send your written offer and details about the team’s next steps.",
    companyName: "Solace",
    opportunityTitle: "Developer Advocate",
    detectedStage: "offer",
    daysAgo: 9,
    hour: 14,
  },
  {
    id: "demo-explore-grove-offer",
    senderName: "Grove Support Leadership",
    senderEmail: "leadership@grove.example",
    subject: "Offer details — Technical Support Lead",
    preview: "Attached are the compensation, benefits, and proposed start date for your review.",
    companyName: "Grove",
    opportunityTitle: "Technical Support Lead",
    detectedStage: "offer",
    daysAgo: 8,
    hour: 12,
  },
  {
    id: "demo-explore-nimbus-accepted",
    senderName: "Nimbus Product Team",
    senderEmail: "welcome@nimbus.example",
    subject: "Welcome to Nimbus — Product Designer",
    preview: "We received your signed offer and are preparing everything for your first week.",
    companyName: "Nimbus",
    opportunityTitle: "Product Designer",
    detectedStage: "accepted",
    daysAgo: 7,
    hour: 9,
  },
  {
    id: "demo-explore-copper-accepted",
    senderName: "Copper Analytics People",
    senderEmail: "people@copperanalytics.example",
    subject: "Offer accepted — Data Analyst",
    preview: "Your acceptance is confirmed. Onboarding information will arrive later this week.",
    companyName: "Copper Analytics",
    opportunityTitle: "Data Analyst",
    detectedStage: "accepted",
    daysAgo: 6,
    hour: 11,
  },
  {
    id: "demo-explore-redpoint-rejected",
    senderName: "Redpoint Recruiting",
    senderEmail: "recruiting@redpoint.example",
    subject: "Update on your Product Manager application",
    preview: "We have decided to move forward with another candidate for this position.",
    companyName: "Redpoint",
    opportunityTitle: "Product Manager",
    detectedStage: "rejected",
    daysAgo: 5,
    hour: 8,
  },
  {
    id: "demo-explore-alpine-rejected",
    senderName: "Alpine Software Careers",
    senderEmail: "careers@alpinesoftware.example",
    subject: "Your Software Engineer application",
    preview: "Thank you for speaking with us. We will not be continuing with this opening.",
    companyName: "Alpine Software",
    opportunityTitle: "Software Engineer",
    detectedStage: "rejected",
    daysAgo: 4,
    hour: 15,
  },
  {
    id: "demo-explore-prism-rejected",
    senderName: "Prism Research Talent",
    senderEmail: "talent@prismresearch.example",
    subject: "Research Coordinator hiring update",
    preview: "The role has been filled, but we appreciate your interest in the research team.",
    companyName: "Prism Research",
    opportunityTitle: "Research Coordinator",
    detectedStage: "rejected",
    daysAgo: 3,
    hour: 10,
  },
  {
    id: "demo-explore-coastline-rejected",
    senderName: "Coastline Engineering",
    senderEmail: "jobs@coastline.example",
    subject: "Application update — Infrastructure Engineer",
    preview: "We have closed this search and will not be progressing your application further.",
    companyName: "Coastline",
    opportunityTitle: "Infrastructure Engineer",
    detectedStage: "rejected",
    daysAgo: 2,
    hour: 13,
  },
  {
    id: "demo-explore-willow-rejected",
    senderName: "Willow Finance Recruiting",
    senderEmail: "recruiting@willowfinance.example",
    subject: "Business Analyst application decision",
    preview: "We selected another applicant whose experience more closely matches our current needs.",
    companyName: "Willow Finance",
    opportunityTitle: "Business Analyst",
    detectedStage: "rejected",
    daysAgo: 1,
    hour: 9,
  },
  {
    id: "demo-explore-arcadia-rejected",
    senderName: "Arcadia Operations",
    senderEmail: "operations@arcadia.example",
    subject: "Operations Associate search update",
    preview: "Thank you for applying. We have completed the search with another candidate.",
    companyName: "Arcadia",
    opportunityTitle: "Operations Associate",
    detectedStage: "rejected",
    daysAgo: 0,
    hour: 12,
  },
];

function relativeTimestamp(daysAgo: number, hour: number) {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(hour, 15, 0, 0);
  return value.toISOString();
}

export const DEMO_EMAILS: readonly DemoEmail[] = EMAIL_BLUEPRINTS.map(
  ({ daysAgo, hour, ...email }) => ({
    ...email,
    receivedAt: relativeTimestamp(daysAgo, hour),
  })
);

export function createDemoProcessingJobs(): JobCardType[] {
  return DEMO_EMAILS.map((email) => ({
    id: email.id,
    title: email.subject,
    description: `From: ${email.senderName} <${email.senderEmail}>\n\n${email.preview}`,
    column: "staging",
    companyName: email.companyName,
    receivedAtRaw: email.receivedAt,
    updatedAtRaw: email.receivedAt,
    providerSource: "gmail",
    reviewNeeded: false,
    recentlyAdded: false,
    applicationStage: email.detectedStage,
  }));
}

export function createDemoSortedJobs(): JobCardType[] {
  return createDemoProcessingJobs().map((job) => ({
    ...job,
    column: job.applicationStage ?? "applied",
    recentlyAdded: true,
  }));
}

export function createDemoExploreJobs(): JobCardType[] {
  return EXPLORE_EMAIL_BLUEPRINTS.map(({ daysAgo, hour, ...email }) => {
    const receivedAt = relativeTimestamp(daysAgo, hour);
    return {
      id: email.id,
      title: email.subject,
      description: `From: ${email.senderName} <${email.senderEmail}>\n\n${email.preview}`,
      column: email.detectedStage,
      companyName: email.companyName,
      receivedAtRaw: receivedAt,
      updatedAtRaw: receivedAt,
      providerSource: "gmail",
      reviewNeeded: false,
      recentlyAdded: false,
      applicationStage: email.detectedStage,
    };
  });
}

export function createDemoFreeRoamJobs(): JobCardType[] {
  return [...createDemoSortedJobs(), ...createDemoExploreJobs()];
}

export function createDemoActiveJobs(
  deletedJobIds: readonly string[]
): JobCardType[] {
  const deletedIds = new Set(deletedJobIds);
  return createDemoSortedJobs().filter((job) => !deletedIds.has(job.id));
}

export function createDemoDeletedJobs(
  deletedJobIds: readonly string[]
): JobCardType[] {
  const deletedIds = new Set(deletedJobIds);
  return createDemoSortedJobs()
    .filter((job) => deletedIds.has(job.id))
    .map((job) => ({
      ...job,
      isDeleted: true,
      recentlyAdded: false,
    }));
}
