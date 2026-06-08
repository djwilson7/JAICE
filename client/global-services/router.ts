// import { localfiles } from "@/directory/path/to/localimport";

import { createBrowserRouter, replace } from "react-router-dom";
import { hasValidAuthenticatedSession } from "@/global-services/auth";

import { LandingRoute } from "@/pages/landing/landing.meta";
import { NavigationBarRoute } from "@/app/layouts/navigation.meta";
import { HomeRoute } from "@/pages/home/home.meta";
import { AboutRoute, AuthAboutRoute } from "@/pages/about/about.meta";
import { DashboardRoute } from "@/pages/dashboard/dashboard.meta";
import { SettingsRoute } from "@/pages/settings/settings.meta";
import { ResumeRoute } from "@/pages/Resume/resume.meta";

// Loader for protected routes that require authentication
async function requireAuth() {
  const isAuthenticated = await hasValidAuthenticatedSession();
  if (!isAuthenticated) throw replace(LandingRoute.path);
  return null;
}

async function redirectAuthenticatedAbout() {
  const isAuthenticated = await hasValidAuthenticatedSession();
  if (isAuthenticated) throw replace(AuthAboutRoute.path);
  return null;
}

function redirectToCanonical(path: string) {
  return ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    return replace(`${path}${url.search}`);
  };
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
    loader: redirectAuthenticatedAbout,
  },
  {
    path: `${AboutRoute.path}/*`,
    loader: redirectToCanonical(AboutRoute.path),
  },
  {
    element: NavigationBarRoute.element,
    loader: requireAuth,
    children: [
      {
        path: AuthAboutRoute.path,
        element: AuthAboutRoute.element,
      },
      {
        path: `${AuthAboutRoute.path}/*`,
        loader: redirectToCanonical(AuthAboutRoute.path),
      },
      {
        path: HomeRoute.path,
        element: HomeRoute.element,
      },
      {
        path: `${HomeRoute.path}/*`,
        loader: redirectToCanonical(HomeRoute.path),
      },
      {
        path: DashboardRoute.path,
        element: DashboardRoute.element,
      },
      {
        path: `${DashboardRoute.path}/*`,
        loader: redirectToCanonical(DashboardRoute.path),
      },
      {
        path: SettingsRoute.path,
        element: SettingsRoute.element,
      },
      {
        path: `${SettingsRoute.path}/*`,
        loader: redirectToCanonical(SettingsRoute.path),
      },
      {
        path: ResumeRoute.path,
        element: ResumeRoute.element,
        caseSensitive: true,
      },
      {
        path: `${ResumeRoute.path}/*`,
        loader: redirectToCanonical(ResumeRoute.path),
        caseSensitive: true,
      },
      {
        path: "/Resume/*",
        loader: redirectToCanonical(ResumeRoute.path),
        caseSensitive: true,
      },
      {
        path: "/Resume",
        loader: redirectToCanonical(ResumeRoute.path),
        caseSensitive: true,
      },
    ],
  },
]);
