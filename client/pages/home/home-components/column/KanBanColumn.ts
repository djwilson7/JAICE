export type KanBanColumn = {
  id: string;
  title: string;
  bg: string;
  visible: boolean;
};

export const kanBanColumns: KanBanColumn[] =  [
  {
    id: "staging",
    title: "Processing",
    bg: "var(--processing-column-bg)",
    visible: true,
  },
  {
    id: "review",
    title: "Review",
    bg: "var(--review-column-bg)",
    visible: true,
  },
  {
    id: "applied",
    title: "Applied",
    bg: "var(--applied-column-bg)",
    visible: true,
  },
  {
    id: "interview",
    title: "Interview",
    bg: "var(--interview-column-bg)",
    visible: true,
  },
  {
    id: "offer",
    title: "Offer",
    bg: "var(--offer-column-bg)",
    visible: true,
  },
  {
    id: "accepted",
    title: "Accepted",
    bg: "var(--accepted-column-bg)",
    visible: true,
  },
  {
    id: "rejected",
    title: "Rejected",
    bg: "var(--rejected-column-bg)",
    visible: true,
  },
];
