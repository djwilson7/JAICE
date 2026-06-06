// import { localfiles } from "@/directory/path/to/localimport";

import { QuickSignIn } from "@/pages/landing/landing-components/QuickSignIn";

export function LandingForm() {
  return (
    <div className="landing-sign-in-panel">
      <div className="landing-sign-in-copy">
        <h3>Sign in to JAICE</h3>
        <p>
          Use a provider below to create your account or continue to your job
          search.
        </p>
      </div>
      <QuickSignIn />
    </div>
  );
}
