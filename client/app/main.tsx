// import { localfiles } from "@/directory/path/to/localimport";
import "@/global-style/Global.css"; // Global CSS style to be injected at app entry point for consistency across all pages.

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "@/global-services/router";
import AuthProvider from "@/global-components/AuthProvider";
import { SettingsProvider } from "@/pages/settings/provider/SettingsProvider";

const root = document.getElementById("root");

ReactDOM.createRoot(root!).render(
  <React.StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </SettingsProvider>
  </React.StrictMode>
);
