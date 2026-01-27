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
    <div className="flex flex-col gap-4 py-4">
      <Button onClick={() => handleThirdPartyLogIn("Google")} title="Google quick sign-in">
        <div className="flex items-center justify-center gap-4">
          <img src={googleIcon} alt="Google" className="w-8 h-8 flex-shrink-0" />
          <h3>Continue with Google</h3>
        </div>
      </Button>
      <Button onClick={() => handleThirdPartyLogIn("Outlook")} disabled={true} title="This feature is coming soon">
        <div className="flex items-center justify-center gap-4">
          <img src={outlookIcon} alt="Outlook" className="w-8 h-8 flex-shrink-0" />
          <h3>Continue with Outlook</h3>
        </div>
      </Button>
    </div>
  );
}
