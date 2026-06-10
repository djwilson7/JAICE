import Button from "@/global-components/button";
import googleIcon from "@/assets/icons/google-logo.svg";
import outlookIcon from "@/assets/icons/outlook-icon.svg";
import { thirdPartyLogIn } from "@/pages/landing/landing.api";
import { useNavigate } from "react-router";

export function QuickSignIn() {
  const navigate = useNavigate();

  const handleThirdPartyLogIn = async (provider: "Google" | "Outlook") => {
    const response = await thirdPartyLogIn(provider);

    if (response[0]) {
      navigate("/home");
    }
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
        title="Continue with Outlook"
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
