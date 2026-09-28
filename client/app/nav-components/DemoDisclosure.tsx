const DEMO_DISCLOSURE_TEXT =
  "To keep this demo safe and self-contained, it uses simulated data and the actual application frontend without external-service connections.";

export function DemoDisclosure() {
  return (
    <aside
      className="demo-disclosure"
      aria-label="Demo environment"
      aria-describedby="demo-disclosure-tooltip"
      tabIndex={0}
    >
      <span className="demo-disclosure__label">
        <svg
          className="demo-disclosure__warning"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M10.3 3.7 2.4 17.4A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.6L13.7 3.7a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <span>Demo</span>
      </span>
      <span
        className="demo-disclosure__tooltip"
        id="demo-disclosure-tooltip"
        role="tooltip"
      >
        {DEMO_DISCLOSURE_TEXT}
      </span>
    </aside>
  );
}
