// import { localfiles } from "@/directory/path/to/localimport";

import { useEffect, useState } from "react";
import { FloatingInputField } from "@/global-components/FloatingInputField";
import Button from "@/global-components/button";
import { useNavigate } from "react-router";
import {
  validateEmail,
  validatePassword,
} from "@/global-services/input-validation";
import { CreateNewAccount, LogUserIn } from "@/pages/landing/landing.api";

import { getAuth, fetchSignInMethodsForEmail } from "firebase/auth";

export function SignUp() {
  const navigate = useNavigate();

  // The overcomplicated state management here is to allow for real-time validation feedback.
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [validEmail, setValidEmail] = useState<boolean | null>(null);
  const [validConfirmEmail, setValidConfirmEmail] = useState<boolean | null>(
    null
  );
  const [validPassword, setValidPassword] = useState<boolean | null>(null);
  const [validConfirmPassword, setValidConfirmPassword] = useState<
    boolean | null
  >(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  const handleEnableCheck = () => {
    if (validEmail && validConfirmEmail && validPassword && validConfirmPassword) {
      setIsEnabled(true);
    } else {
      setIsEnabled(false);
    }
  };

  useEffect(() => {
    handleEnableCheck();
  }, [validEmail, validConfirmEmail, validPassword, validConfirmPassword]);

  const submitTitle = isEnabled ? "Create Account" : "Fill out all fields correctly to create a new account";
  // The following function handles form submission

  // The following functions handle real-time input and validation
  const handleEmailInput = async (value: string) => {
    setEmail(value);

    setEmailError(null); // Clear email error when user modifies input

    const isEmailFormatValid = validateEmail(value) && value !== "";

    if (!isEmailFormatValid) {
      setValidEmail(false);
      setEmailError("Please enter a valid email address.");
      return;
    }

    // check if emails already exists
    try {
      // gets firebase auth instance
      const auth = getAuth();
      // checks if email is already registered
      const signInMethods = await fetchSignInMethodsForEmail(auth, value);

      if (signInMethods.length > 0) {
        // Email IS already registered
        setValidEmail(false);
        setEmailError("Email already in use. Please use a different email.");
      } else {
        // Email is NOT registered
        setValidEmail(true);
        setEmailError(null);
      }
    } catch (error) {
      // If firebase check fails for some reason. Assume email is valid to not block user.
      console.error("Error checking email existence:", error);

      setValidEmail(true);
      setEmailError(null);
    }
  };

  const handleConfirmEmailInput = (value: string) => {
    setConfirmEmail(value);
    setValidConfirmEmail(value === email && value !== "");
  };

  const handlePasswordInput = (value: string) => {
    setPassword(value);
    setValidPassword(validatePassword(value) && value !== "");
  };

  const handleConfirmPasswordInput = (value: string) => {
    setConfirmPassword(value);
    setValidConfirmPassword(value === password && value !== "");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    // Prevent default form submission behavior
    event.preventDefault();

    // Validate all fields
    const isValid =
      validEmail && validConfirmEmail && validPassword && validConfirmPassword;

    // If any field is invalid, set the corresponding validation states to false to trigger error messages
    if (!isValid) {
      console.log("Input is invalid, please correct the errors.");

      if (!validEmail) {
        setValidEmail(false);
        if (!emailError) {
          setEmailError("Please enter a valid email address.");
        }
        console.log("Email is not valid");
      }

      if (!validPassword) {
        setValidPassword(false);
        console.log("Password is not valid");
      }

      if (!validConfirmEmail) {
        setValidConfirmEmail(false);
        console.log("Emails do not match");
      }

      if (!validConfirmPassword) {
        setValidConfirmPassword(false);
        console.log("Passwords do not match");
      }
      return;
    }

    // If all fields are valid, proceed with form submission
    console.log("Input Valid, proceeding with submission");

    // call the front end api to create the account
    const [accountCreated, accountMessage] = await CreateNewAccount({
      email,
      password,
    });

    // If account creation fails, log the error message
    // If it succeeds, log in the user
    if (!accountCreated) {
      console.log("Account creation failed:", accountMessage);

      // check if the email is already in use
      if (accountMessage?.includes("email-already-in-use")) {
        setValidEmail(false);
        setEmailError("Email address is already in use.");
      }
      // for other errors
      else {
        setValidEmail(false);
        setEmailError("Failed to create account. Please try again later.");
      }
      return;
    }

    // account created successfull
    console.log("Account created, logging in user");
    await LogUserIn({ navigate, email, password });
  };

  return (
    <div>
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <FloatingInputField
          label="Email"
          type="email"
          value={email}
          isValid={validEmail}
          action={handleEmailInput}
          errorTitle="Invalid Email"
          errorMessage={emailError || "Please enter a valid email address."}
        />
        <FloatingInputField
          label="Confirm Email"
          type="email"
          value={confirmEmail}
          isValid={validConfirmEmail}
          action={handleConfirmEmailInput}
          errorTitle="Email Mismatch"
          errorMessage="Emails do not match."
        />

        <FloatingInputField
          label="Password"
          type="password"
          value={password}
          isValid={validPassword}
          action={handlePasswordInput}
          errorTitle="Minimum Requirements Not Met"
          errorMessage="8 Characters, 1 Number, 1 Special"
        />
        <FloatingInputField
          label="Confirm Password"
          type="password"
          value={confirmPassword}
          isValid={validConfirmPassword}
          action={handleConfirmPasswordInput}
          errorTitle="Password Mismatch"
          errorMessage="Passwords do not match."
        />
        <Button type="submit" disabled={!isEnabled} title={submitTitle}>
          Sign Up
        </Button>
      </form>
    </div>
  );
}
