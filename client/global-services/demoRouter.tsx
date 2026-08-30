import { Navigate, createBrowserRouter } from "react-router-dom";
import { LandingPage } from "@/pages/landing/LandingPage";
import { AboutPage } from "@/pages/about/AboutPage";
import { NavigationBar } from "@/app/layouts/NavigationBar";
import { HomePage } from "@/pages/home/HomePage";

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
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
