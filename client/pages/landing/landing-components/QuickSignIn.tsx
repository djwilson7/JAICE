// import { localfiles } from "@/directory/path/to/localimport";

import Button from "@/global-components/button";
import googleIcon from "@/assets/icons/google-logo.svg";
import outlookIcon from "@/assets/icons/outlook-icon.svg";
import { thirdPartyLogIn } from "@/pages/landing/landing.api";
import { useNavigate } from "react-router";

export function QuickSignIn() {
  // Navigate function from react-router
  const navigate = useNavigate();

  // Function to handle third-party login
  const handleThirdPartyLogIn = async (provider: "Google" | "Outlook") => {
    // Placeholder for actual third-party login logic
    console.log(`${provider} login initiated`);

    // Simulate third-party login process
    const response = await thirdPartyLogIn(provider);

    // Handle the response from the third-party login
    console.log("Third-party login response:", response);

    // If login is successful, navigate to the home page
    if (response[0]) {
      navigate("/home");
    }
    // Here we would relay the error message from the auth service to the user.
  };

  return (
    <div className="landing-provider-list">
      <Button
        onClick={() => handleThirdPartyLogIn("Google")}
        title="Continue with Google"
        className="landing-provider-button"
      >
        <div className="landing-provider-button-content">
          <img src={googleIcon} alt="" aria-hidden="true" />
          <span>Continue with Google</span>
        </div>
      </Button>
      <Button
        onClick={() => handleThirdPartyLogIn("Outlook")}
        disabled
        title="Outlook sign-in is coming soon"
        className="landing-provider-button"
      >
        <div className="landing-provider-button-content">
          <img src={outlookIcon} alt="" aria-hidden="true" />
          <span>Continue with Outlook</span>
          <small>Coming soon</small>
        </div>
      </Button>
    </div>
  );
}
