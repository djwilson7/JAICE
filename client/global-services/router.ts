// import { localfiles } from "@/directory/path/to/localimport";

import { createBrowserRouter, redirect } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/global-services/firebase";

import { LandingRoute } from "@/pages/landing/landing.meta";
import { NavigationBarRoute } from "@/app/layouts/navigation.meta";
import { HomeRoute } from "@/pages/home/home.meta";
import { AboutRoute } from "@/pages/about/about.meta";
import { DashboardRoute } from "@/pages/dashboard/dashboard.meta";
import { AccountRoute } from "@/pages/settings/account/account.meta";
import { DisplayRoute } from "@/pages/settings/display/display.meta";
import { NotificationsRoute } from "@/pages/settings/notifications/notification.meta";
import { AuthAboutRoute } from "@/pages/auth-about/authabout.meta";
import { ResumeRoute } from "@/pages/Resume/resume.meta";

// Wait until Firebasse Auth initializes and sets the current user
function waitForAuth(timeoutMs = 5000): Promise<User | null> {
  // If Firebase already has a current user, resolve immediately
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
    // Safety timeout
    setTimeout(() => {
      try { unsubscribe(); } catch {}
      resolve(auth.currentUser);
    }, timeoutMs);
  });
}

// Loader for protected routes that require authentication
async function requireAuth() {
  const user = await waitForAuth();
  if (!user) throw redirect(LandingRoute.path);
  return null;
}

// All routes with 'loade: requireAuth' are protected and require authentication
// Public routes (no authentication required) do not have this loader
export const router = createBrowserRouter([
  {
    path: LandingRoute.path,
    element: LandingRoute.element,
  },
  {
    path: AboutRoute.path,
    element: AboutRoute.element,
  },
  {
    element: NavigationBarRoute.element,
    children: [
      {
        path: HomeRoute.path,
        element: HomeRoute.element,
        loader: requireAuth,
      },
      {
        path: AuthAboutRoute.path,
        element: AuthAboutRoute.element,
        loader: requireAuth,
      },
      {
        path: DashboardRoute.path,
        element: DashboardRoute.element,
        loader: requireAuth,
      },
      {
        path: AccountRoute.path,
        element: AccountRoute.element,
        loader: requireAuth,
      },
      {
        path: DisplayRoute.path,
        element: DisplayRoute.element,
        loader: requireAuth,
      },
      {
        path: NotificationsRoute.path,
        element: NotificationsRoute.element,
        loader: requireAuth,
      },
      {
        path: ResumeRoute.path,
        element: ResumeRoute.element,
        loader: requireAuth,
      },
    ],
  },
]);
