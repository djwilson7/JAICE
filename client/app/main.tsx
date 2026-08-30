// import { localfiles } from "@/directory/path/to/localimport";
import "@/global-style/Global.css"; // Global CSS style to be injected at app entry point for consistency across all pages.

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { SettingsProvider } from "@/pages/settings/provider/SettingsProvider";
import { BannerNotificationProvider } from "@/global-components/BannerNotificationProvider";
import { IS_DEMO_MODE } from "@/global-services/projectMode";

const root = document.getElementById("root");

async function mountApplication() {
  const appRouter = IS_DEMO_MODE
    ? (await import("@/global-services/demoRouter")).demoRouter
    : (await import("@/global-services/router")).router;

  let application = (
    <BannerNotificationProvider>
      <RouterProvider router={appRouter} />
    </BannerNotificationProvider>
  );

  if (!IS_DEMO_MODE) {
    const { default: AuthProvider } = await import(
      "@/global-components/AuthProvider"
    );
    application = <AuthProvider>{application}</AuthProvider>;
  }

  ReactDOM.createRoot(root!).render(
    <React.StrictMode>
      <SettingsProvider>
        {application}
      </SettingsProvider>
    </React.StrictMode>
  );
}

export const applicationReady = mountApplication();
