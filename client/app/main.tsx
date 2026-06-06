// import { localfiles } from "@/directory/path/to/localimport";
import "@/global-style/Global.css"; // Global CSS style to be injected at app entry point for consistency across all pages.

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/global-services/router";
import AuthProvider from "@/global-components/AuthProvider";
import { SettingsProvider } from "@/pages/settings/provider/SettingsProvider";
import { BannerNotificationProvider } from "@/global-components/BannerNotificationProvider";

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <React.StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <BannerNotificationProvider>
          <RouterProvider router={router} />
        </BannerNotificationProvider>
      </AuthProvider>
    </SettingsProvider>
  </React.StrictMode>
);
