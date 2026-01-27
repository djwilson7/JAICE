// import { localfiles } from "@/directory/path/to/localimport";

import { LogIn } from "./LogIn";
import { SignUp } from "./SignUp";
import { useState } from "react";
import { SlidingToggle } from "@/global-components/SlidingToggle";
import { QuickSignIn } from "@/pages/landing/landing-components/QuickSignIn";

export function LandingForm() {
  const [newUser, setNewUser] = useState(false);

  const formStyle = {
    border: "2px solid var(--primary-three)",
    borderRadius: "1rem",
    padding: "2rem",
    background: "rgba(var(--primary-five-rgb), 0.1)",
    boxShadow: "0 0px 10px rgba(var(--primary-three-rgb), 0.4)"
  }

  return (
    <div className="flex flex-col justify-between gap-4 w-full" style={formStyle}>
      {/* <SlidingToggle
        leftLabel="Log In"
        rightLabel="Sign Up"
        action={setNewUser}
        initialValue={true}
      /> */}
      {/* {newUser ? <SignUp /> : <LogIn />} */}
      <div className="flex flex-col justify-center my-4 gap-4 items-center">
        <h3 className="">Login or Signup</h3>
        <p>JAICE is a passwordless service. Please use a provider below to create an account or login.</p>
      </div>
      <QuickSignIn />
    </div>
  );
}
