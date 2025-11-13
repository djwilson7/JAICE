// import { localfiles } from "@/directory/path/to/localimport";

import { auth } from "@/global-services/firebase";
import Button from "@/global-components/button";
import { deleteCurrentUser, getIdToken } from "@/global-services/auth";
import { useEffect, useState } from "react";
import { api } from "@/global-services/api";
import userIcon from "@/assets/icons/user.svg";
import { FloatingInputField } from "@/global-components/FloatingInputField";
import { DaysToSync } from "./account-components/DaysToSync";

export function AccountPage() {
  const [busy, setBusy] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [twoFAError, setTwoFAError] = useState<string | null>(null);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
    null
  );

  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);
  const [showDaysToSync, setShowDaysToSync] = useState(false);
  const [daysToSync, setDaysToSync] = useState<number | null>(null);

  const daysToSyncOptions = [3, 7, 14, 45];

  // Get the inital Gmail connection status for the user when they load the page
  useEffect(() => {
    checkGmailStatus();
  }, []);

  async function checkGmailStatus() {
    try {
      const response = await api("/api/auth/gmail-consent-status");
      console.log("Gmail consent status response:", response);
      setGmailConnected(response.isConnected);
      setGmailError(null);
      return;
    } catch (err) {
      console.error("Error checking Gmail consent status:", err);
      setGmailConnected(false);
      setGmailError("Error checking gmail status.");
    }
  }
  async function handleShowModal() {
    if (gmailConnected) {
      await handleGmailLinking();
      return;
    }
    setShowDaysToSync(true);
  }

  // Handle the user's selection of days to sync from Gmail
  async function handleDaysSelection(days: number) {
    setDaysToSync(days);
    await handleGmailLinking(days);
  }

  // Handle linking or unlinking Gmail
  async function handleGmailLinking(days?: number) {
    if (gmailBusy) return;
    setGmailBusy(true);

    try {
      if (gmailConnected) {
        console.log("Unlinking Gmail...");
        const res = await unlinkGmail();
        if (res.status === "success") {
          setGmailConnected(false);
        }
      } else {
        console.log("Linking Gmail...");
        const res = await linkGmail(days);
        if (res.status === "success") {
          setGmailConnected(true);
        }
      }
      setGmailError(null);
    } catch (error) {
      console.error("Gmail link/unlink error:", error);
      setGmailError("Error processing Gmail link.");
    } finally {
      setShowDaysToSync(false);
      setGmailBusy(false);
    }
  }

  async function linkGmail(days: number = 14) {
    const res = await api("/api/auth/setup-rls-session", {
      method: "POST",
      body: JSON.stringify({ daysToSync: days }),
    });
    console.log("Setup RLS session response:", res);
    const token = await getIdToken();
    window.location.href = `http://localhost:8000/api/auth/consent?token=${token}&days=${days}`;
    return res;
  }

  async function unlinkGmail() {
    return await api("/api/auth/revoke-gmail-consent", { method: "POST" });
  }

  // Determine the Gmail button text based on connection status and busy state
  const gmailButtonText = gmailBusy
    ? "Processing..."
    : gmailConnected
    ? "Unlink Gmail"
    : "Link Gmail";

  async function handleDelete() {
    setDeleteAccountError(null);
    const sure = window.confirm(
      "This will permanently delete your account. This cannot be undone. Continue?"
    );
    if (!sure) return;

    setBusy(true);
    const res = await deleteCurrentUser(); // if you support email/password reauth, pass { email, password } here
    setBusy(false);

    if (res.ok) {
      // Account deleted; user will be signed out. Send them to your Landing page.
      window.location.assign("/");
      return;
    }

    if (
      res.code === "reauth-needed" ||
      res.code === "auth/requires-recent-login"
    ) {
      setDeleteAccountError("Please re-authenticate and try again.");
      // If you support email/password, collect the current password and retry:
      const email = auth.currentUser?.email?.toString();
      const password =
        prompt("Confirm your current password to continue:") || "";
      if (password) {
        setBusy(true);
        const retry = await deleteCurrentUser({ email, password });
        setBusy(false);
        if (retry.ok) {
          window.location.assign("/");
          return;
        }
        setDeleteAccountError(`Failed to delete account: ${retry.code}`);
      }
      return;
    }

    setDeleteAccountError(`Failed to delete account: ${res.code}`);
  }

  // This was refactored for better readability on the page. It still needs updated to present on mobile devices.
  return (
    <div
      className="w-full h-full bg-slate-950 text-slate-100"
      style={{ background: "var(--color-bg)" }}
    >
      <main className="flex flex-col md:flex-row w-full justify-center">
        {/* Left/Top Heading*/}
        {/* <div className="w-full md:w-1/2">
          <h1 className="text-2xl md:text-3xl font-semibold leading-snug">
            Account Settings
          </h1>
        </div> */}
        {/* Right/Bottom Content */}
        <div className="flex flex-col md:flex-row w-full h-full items-top justify-around gap-4 md:m-4 p-4">
          {/* Right panel */}
          <section className="flex flex-col w-full md:w-1/2  pl-1 pr-1 md:pl-4 md:pr-4 pt-2 pb-2">
            <h1 className="text-2xl md:text-3xl font-semibold leading-snug w-full text-left my-4">
              Profile Info
            </h1>
            <hr className="w-full border-t-1 border-gray-400" />

            {/*Profile image*/}
            <div className="flex flex-col items-center justify-evenly mt-6 mb-2">
              <div className="w-24 h-24 rounded-full bg-white mb-4 aspect-square">
                <img
                  src={userIcon}
                  alt="Profile Picture"
                  className="w-full h-full rounded-full object-cover p-0.5"
                />
              </div>
              <div className="flex flex-col gap-2 text-center items-center jusitfy-evenly">
                <div className="flex gap-4">
                  <Button onClick={() => console.log("Change Photo clicked")}>
                    Change
                  </Button>

                  <Button onClick={() => console.log("Remove Photo clicked")}>
                    Remove
                  </Button>
                </div>
                <div className="text-sm font-light">
                  <small className="text-sm text-gray-400 font-light">
                    We support PNGs, JPGs, and GIFs under 2MB.
                  </small>
                </div>
              </div>
            </div>

            {/*Name and Number*/}
            <div className="flex flex-col w-full my-4 gap-4">
              <FloatingInputField
                label="First Name"
                type="text"
                value=""
                action={() => console.log("First Name changed")}
                isValid={true}
              />
              <FloatingInputField
                label="Last Name"
                type="text"
                value=""
                action={() => console.log("Last Name changed")}
                isValid={true}
              />
              <FloatingInputField
                label="Phone Number"
                type="text"
                value=""
                action={() => console.log("Phone Number changed")}
                isValid={true}
              />
            </div>
          </section>

          <section className="flex flex-col w-full md:w-1/2 pl-1 pr-1 md:pl-4 md:pr-4 pt-2 pb-2">
            <div className="flex w-full flex-col">
              <h1 className="text-2xl md:text-3xl font-semibold leading-snug w-full text-left my-4">
                Account Security
              </h1>
              <hr className="w-full border-t-1 border-gray-400" />
            </div>

            {/*Gmail Integration*/}
            <div className="flex flex-col items-center justify-center my-4 items-center w-full">
              <div className="flex w-full gap-4">
                <div className="flex flex-col w-1/2">
                  <h3 className="text-lg text-left font-medium text-gray-300">
                    Gmail Integration
                  </h3>
                  <small className="text-sm text-left text-gray-400 ">
                    Connect your Gmail account to allow email parsing and
                    analysis.
                  </small>
                </div>
                <div className="flex items-center justify-center w-1/2">
                  <Button
                    onClick={handleShowModal}
                    style={{ minWidth: "100%" }}
                  >
                    {gmailButtonText}
                  </Button>
                </div>
              </div>
              <div className="flex w-full items-center justify-center my-2">
                <small className="text-sm text-red-400" role="alert">
                  {gmailError}
                </small>
              </div>
            </div>

            {/* Password Reset */}
            <div className="flex flex-col items-center justify-center my-4 items-center w-full">
              <div className="flex w-full gap-4 py-2">
                <div className="flex w-1/2 items-center">
                  <FloatingInputField
                    label="Reset Password"
                    type="password"
                    value=""
                    action={() => console.log("User is entering new password.")}
                    isValid={true}
                    style={{ minWidth: "100%" }}
                  />
                </div>
                <div className="flex items-center justify-center w-1/2">
                  <Button
                    onClick={() => console.log("Change Password clicked")}
                    style={{ minWidth: "100%" }}
                  >
                    Change
                  </Button>
                </div>
              </div>
              <div className="flex w-full items-center justify-center my-2">
                <small className="text-sm text-red-400" role="alert">
                  {passwordError}
                </small>
              </div>
            </div>

            {/* 2FA */}
            <div className="flex flex-col items-center justify-center my-4 items-center w-full">
              <div className="flex w-full gap-4">
                <div className="flex flex-col w-3/4">
                  <h3 className="text-lg text-left font-medium text-gray-300 mt-4">
                    Two-Factor Authentication (2FA)
                  </h3>
                  <small className="text-sm text-left text-gray-400 mb-4">
                    Enable 2FA to add an extra layer of security to your
                    account.
                  </small>
                </div>
                <div className="flex items-center justify-center w-1/4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      onChange={() => console.log("2FA toggled")}
                    />
                    <div
                      className="w-11 h-6 bg-gray-600 
                    rounded-full peer peer-focus:ring-blue-300 peer-checked:bg-blue-600 
                    after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:border-gray-300 
                    after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"
                    ></div>
                  </label>
                </div>
              </div>
              <div className="flex w-full items-center justify-center my-2">
                <small className="text-sm text-red-400" role="alert">
                  {twoFAError}
                </small>
              </div>
            </div>

            {/* Delete Account */}
            <div className="flex flex-col items-center justify-center my-4 items-center w-full">
              <div className="flex w-full gap-4">
                <div className="flex flex-col w-1/2">
                  <h3 className="text-lg text-left font-medium text-gray-300">
                    Delete your JAICE account?
                  </h3>
                  <small className="text-sm text-left text-gray-400">
                    This will permanently delete your account and all associated
                    data.
                  </small>
                </div>
                <div className="flex items-center justify-center w-1/2">
                  <Button
                    onClick={handleDelete}
                    // disabled={busy}
                    aria-busy={busy}
                    // className="red"
                    style={{ minWidth: "100%" }}
                  >
                    {busy ? "Deleting..." : "Delete Account"}
                  </Button>
                </div>
              </div>
              <div className="flex w-full items-center justify-center my-2">
                <small className="text-sm text-red-400" role="alert">
                  {deleteAccountError}
                </small>
              </div>
            </div>
          </section>
        </div>
      </main>
      {/*Controls the Modal that allows users to specify the initial number of days to sync from gmail*/}
      <DaysToSync
        show={showDaysToSync}
        options={daysToSyncOptions}
        onSelection={handleDaysSelection}
        onCancel={() => setShowDaysToSync(false)}
      />
    </div>
  );
}
