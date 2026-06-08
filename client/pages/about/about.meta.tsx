// import { localfiles } from "@/directory/path/to/localimport";

import { AboutPage } from "@/pages/about/AboutPage";

export const AboutRoute = {
  path: "/about",
  element: <AboutPage />,
};

export const AuthAboutRoute = {
  path: "/auth-about",
  element: <AboutPage isPublic={false} />,
};
