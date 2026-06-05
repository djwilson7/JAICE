// import { localfiles } from "@/directory/path/to/localimport";

import { useEffect, useState } from "react";
import { FloatingInputField } from "@/global-components/FloatingInputField";
import Button from "@/global-components/button";
import {
  validateEmail,
  validatePassword,
} from "@/global-services/input-validation";
import { LogUserIn } from "../landing.api";
import { useNavigate } from "react-router";

export function LogIn() {
  // The overcomplicated state management here is to allow for real-time validation feedback.
  const [email, setEmail] = useState(""); // we can set inital values for testing here (a base email and password that's valid once auth is set up)
  const [password, setPassword] = useState("");
  const [validEmail, setValidEmail] = useState<boolean | null>(null);
  const [validPassword, setValidPassword] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const [isEnabled, setIsEnabled] = useState(false);
  // The following functions handle real-time input and validation
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    event.preventDefault();

    // Validate all fields
    const isValid = validEmail && validPassword;

    // If any field is invalid, set the corresponding validation states to false to trigger error messages
    if (!isValid) {
      console.log("Input is invalid, please correct the errors.");

      if (!validEmail) {
        setValidEmail(false);
        console.log("Email is not valid");
      }
      if (!validPassword) {
        setValidPassword(false);
        console.log("Password is not valid");
      }
      return;
    }

    // If all fields are valid, proceed with form submission
    console.log("Input Valid, proceeding with submission");
    await LogUserIn({ navigate, email, password });
  };

  const submitTitle = isEnabled ? "Log In" : "Fill out all fields correctly to log in";

  // The following functions handle real-time input and validation
  const handleEmailInput = (value: string) => {
    setEmail(value);
    setValidEmail(validateEmail(value) && value !== "");
  };

  const handlePasswordInput = (value: string) => {
    setPassword(value);
    setValidPassword(validatePassword(value) && value !== "");
  };

  useEffect(() => {
    setIsEnabled(Boolean(validEmail && validPassword));
  }, [validEmail, validPassword]);

  return (
    <div>
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <FloatingInputField
          label="Email"
          type="email"
          value={email}
          isValid={validEmail}
          action={handleEmailInput}
        />
        <FloatingInputField
          label="Password"
          type="password"
          value={password}
          isValid={validPassword}
          action={handlePasswordInput}
        />
        <Button type="submit" disabled={!isEnabled} title={submitTitle}>Log In</Button>
      </form>
    </div>
  );
}
