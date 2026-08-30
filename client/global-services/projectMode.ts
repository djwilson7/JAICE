export const PROJECT_MODES = {
  dev: "dev",
  demo: "demo",
} as const;

export type ProjectMode = (typeof PROJECT_MODES)[keyof typeof PROJECT_MODES];

export function parseProjectMode(value: string | undefined): ProjectMode {
  const normalizedValue = value?.trim().toLowerCase();

  if (normalizedValue === PROJECT_MODES.dev) return PROJECT_MODES.dev;
  if (normalizedValue === PROJECT_MODES.demo) return PROJECT_MODES.demo;

  throw new Error(
    'VITE_PROJECT_MODE must be set to either "dev" or "demo".'
  );
}

export const PROJECT_MODE = parseProjectMode(
  import.meta.env.VITE_PROJECT_MODE
);

export const IS_DEMO_MODE = PROJECT_MODE === PROJECT_MODES.demo;
