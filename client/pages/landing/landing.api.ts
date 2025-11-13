// import { localfiles } from "@/directory/path/to/localimport";

import {
  emailSignIn,
  emailSignUp,
  googleSignIn,
} from "@/global-services/auth";
import type { NavigateFunction } from "react-router";
import { api } from "@/global-services/api";
// Return shape used components: [ok, message?]
type ApiResponse = [boolean, string?];

async function checkOrCreateUserInDB(): Promise<ApiResponse> {
  try {
    console.log("Checking or Creating user database record");
    const response = await api("/api/auth/setup-user-db", { method: "POST" });
    console.log("User database record check/create response:", response);
    if (response.status === 200) {
      return [true, "User database record verified/created"];
    } else {
      return [false, "Failed to verify/create user database record"];
    }
  } catch (error: any) {
    return [false, error?.message ?? "Failed to verify/create user database record"];
  }
}

/*
 * Create New Account Function
 * Simulates an API call to create a new user account, we need to hook this into our backend.
 */
export async function CreateNewAccount({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  // takes the email and password, and creates a new account.
  try {
    await emailSignUp(email, password);
    await checkOrCreateUserInDB();
    return [true, "Account created successfully"];
  } catch (error: any) {
    return [false, error?.message ?? "Account creation failed"]; 
  }
}

export async function LogUserIn({
  navigate,
  email,
  password,
}: {
  navigate: NavigateFunction; // (path: string) => void;
  email: string;
  password: string;
}): Promise<ApiResponse> {
  try {
    await emailSignIn(email, password);
    await checkOrCreateUserInDB();
    navigate("/home");
    return [true, "Login successful"];
  } catch (error: any) {
    return [false, error?.message ?? "Login failed"];
  }
}

// Simulated Third-Party Log In Function
// This function simulates logging in with a third-party provider like Google or Outlook.
export async function thirdPartyLogIn(
  provider: "Google" | "Outlook"
): Promise<ApiResponse> {
  try {
    if (provider === "Google") {
      await googleSignIn();
      await checkOrCreateUserInDB();
      console.log(
        "Google sign-in completed - Gmail access already granted through popup"
      );
      return [true, "Google log in successful"];
    } else {
      // Placeholder for Outlook sign-in method
      return [false, "Outlook sign in not implemented"];
    }
  } catch (error: any) {
    return [false, error?.message ?? `${provider} log in failed`];
  }
}
