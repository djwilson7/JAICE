// import { localfiles } from "@/directory/path/to/localimport";

import 
{
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  deleteUser,
  reauthenticateWithPopup,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";

import type { User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

function clearLocalAuthData() {
  localStorage.removeItem("google_access_token");
  localStorage.removeItem("gmail_consent_granted");
}

function getAuthErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

// Observe auth state changes
export function observeUser(callback: (user: User | null) => void) 
{
    const unsubscribe = onAuthStateChanged(auth, (user) => callback(user));
    return unsubscribe;
}

// Sign up a new user with email and password
export async function emailSignUp(email: string, password: string) 
{
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // clear any existing google tokens
    clearLocalAuthData();

    return userCredential.user;
}

// Sign in an existing user with email and password
export async function emailSignIn(email: string, password: string) 
{
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // clear any existing google tokens
    clearLocalAuthData();

    return userCredential.user;
}

export async function googleSignIn() {
    const userCredential = await signInWithPopup(auth, googleProvider);
    clearLocalAuthData();
    return userCredential.user;
}

// ------- TODO: Add Outlook sign-in method ----------

// Sign out the current user
export async function logOut() 
{
    clearLocalAuthData();
    await signOut(auth);
}

export async function hasValidAuthenticatedSession(): Promise<boolean> {
  try {
    await auth.authStateReady();

    const user = auth.currentUser;
    if (!user) {
      clearLocalAuthData();
      return false;
    }

    await user.getIdToken(true);
    return true;
  } catch (error) {
    console.error("Authentication validation failed:", error);

    try {
      await logOut();
    } catch (signOutError) {
      console.error("Failed to clear the invalid Firebase session:", signOutError);
      clearLocalAuthData();
    }

    return false;
  }
}

// Get a 'fresh' ID token for the current user
export async function getIdToken(forceRefresh = false) 
{
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken(forceRefresh);
}

// get google OAuth token
export function getGoogleAccessToken(): string | null
{
    return localStorage.getItem('google_access_token');
}

// check if current user has gmail access
export function hasGmailAccess(): boolean
{
    const user = auth.currentUser;
    if (!user) return false;

    // check if user signed in with google and has access token
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');

    if (isGoogleUser) 
    {
      const hasToken = !!getGoogleAccessToken();
          // check if they have previously granted consent
      const hasGrantedConsent = localStorage.getItem('gmail_consent_granted') === 'true';
      return hasToken || hasGrantedConsent;
    } else {
      return localStorage.getItem('gmail_consent_granted') === 'true';
    }
}

// // check if user has previously granted gmail consent
// export function hasGmailConsentGranted(): boolean
// {
//     return localStorage.getItem('gmail_consent_granted') === 'true';
// }

// mark the user has granted gmail consent
// export function setGmailConsentGranted(): void
// {
//     localStorage.setItem('gmail_consent_granted', 'true');
// }

// get user info including gmail access status
export function getCurrentUserInfo()
{
    const user = auth.currentUser;
    if (!user) return null;

    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    const userHasGmailAccess = hasGmailAccess();

    return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        isGoogleUser,
        hasGmailAccess: userHasGmailAccess,
        providers: user.providerData.map(p => p.providerId)
    };
}

/**
 * Delete the currently signed-in user.
 * - If recent login is required and the provider is Google, it will try a quick reauth popup automatically.
 * - Returns { ok: true } on success, or { ok: false, code } on failure so the UI can react.
 */
export async function deleteCurrentUser(opts?: { email?: string; password?: string }) {
  const user = auth.currentUser;
  if (!user) return { ok: false as const, code: "no-user" as const };

  try {
    await deleteUser(user);
    return { ok: true as const };
  } catch (err: unknown) {
    const code = getAuthErrorCode(err);
    if (code !== "auth/requires-recent-login") {
      return { ok: false as const, code: code ?? "unknown" };
    }

    // Requires recent login — try to reauthenticate based on provider
    const providerIds = user.providerData.map((p) => p.providerId);

    try {
      if (providerIds.includes("google.com")) {
        // Reauth with Google popup
        await reauthenticateWithPopup(user, googleProvider);
      } else if (providerIds.includes("password")) {
        // Need email & current password for email/password reauth
        if (!opts?.email || !opts?.password) {
          return { ok: false as const, code: "reauth-needed" as const };
        }
        const cred = EmailAuthProvider.credential(opts.email, opts.password);
        await reauthenticateWithCredential(user, cred);
      } else {
        // Other providers: instruct UI to trigger a reauth flow
        return { ok: false as const, code: "reauth-needed" as const };
      }

      // After successful reauth, try delete again
      await deleteUser(user);
      return { ok: true as const };
    } catch (reauthErr: unknown) {
      return { ok: false as const, code: getAuthErrorCode(reauthErr) ?? "reauth-failed" as const };
    }
  }
}
