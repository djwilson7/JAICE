import { Navigate, createBrowserRouter } from "react-router-dom";
import { LandingPage } from "@/pages/landing/LandingPage";
import { AboutPage } from "@/pages/about/AboutPage";
import { NavigationBar } from "@/app/layouts/NavigationBar";
import { HomePage } from "@/pages/home/HomePage";
import { AuthAboutRoute } from "@/pages/about/about.meta";
import { DashboardRoute } from "@/pages/dashboard/dashboard.meta";
import { ResumeRoute } from "@/pages/Resume/resume.meta";
import { SettingsRoute } from "@/pages/settings/settings.meta";

export const demoRouter = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/about",
    element: <AboutPage />,
  },
  {
    element: <NavigationBar />,
    children: [
      {
        path: "/home",
        element: <HomePage />,
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
        path: ResumeRoute.path,
        element: ResumeRoute.element,
        caseSensitive: true,
      },
      {
        path: SettingsRoute.path,
        element: <Navigate to="/" replace />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
