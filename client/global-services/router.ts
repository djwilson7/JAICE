// import { localfiles } from "@/directory/path/to/localimport";

import { createBrowserRouter, replace } from "react-router-dom";
import { hasValidAuthenticatedSession } from "@/global-services/auth";

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

// Loader for protected routes that require authentication
async function requireAuth() {
  const isAuthenticated = await hasValidAuthenticatedSession();
  if (!isAuthenticated) throw replace(LandingRoute.path);
  return null;
}

// All routes under the authenticated layout require a valid Firebase session.
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
    loader: requireAuth,
    children: [
      {
        path: HomeRoute.path,
        element: HomeRoute.element,
      },
      {
        path: AuthAboutRoute.path,
        element: AuthAboutRoute.element,
      },
      {
        path: DashboardRoute.path,
        element: DashboardRoute.element,
      },
      {
        path: AccountRoute.path,
        element: AccountRoute.element,
      },
      {
        path: DisplayRoute.path,
        element: DisplayRoute.element,
      },
      {
        path: NotificationsRoute.path,
        element: NotificationsRoute.element,
      },
      {
        path: ResumeRoute.path,
        element: ResumeRoute.element,
      },
    ],
  },
]);
