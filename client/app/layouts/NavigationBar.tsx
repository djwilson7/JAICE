// import { localfiles } from "@/directory/path/to/localimport";
import { NavButton } from "../nav-components/NavButton";
import { ThemeToggleButton } from "../nav-components/ThemeToggleButton";
import { MenuToggleButton } from "../nav-components/MenuToggleButton";

import { MainHeader } from "@/app/nav-components/MainHeader";

import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { logOut } from "@/global-services/auth";

// Icons
import homeIcon from "@/assets/icons/home.svg";
import aboutIcon from "@/assets/icons/book-open-cover.svg";
import dashboardIcon from "@/assets/icons/chart-pie-alt.svg";
import accountIcon from "@/assets/icons/user.svg";
import accessibilityIcon from "@/assets/icons/hand-paper.svg";
import notificationIcon from "@/assets/icons/bell-notification-social-media.svg";
import quitIcon from "@/assets/icons/user-logout.svg";

import { getCSSVar } from "@/utils/getCSSVar";
import resumeIcon from "@/assets/icons/resume.svg";

import { motion } from "framer-motion";
import { api } from "@/global-services/api";

const primaryOptions = {
  home: { route: "/home", label: "Home", icon: homeIcon, title: "Go to Home" },
  about: {
    route: "/auth-about",
    label: "About",
    icon: aboutIcon,
    title: "Go to About",
  },
  dashboard: {
    route: "/dashboard",
    label: "Dashboard",
    icon: dashboardIcon,
    title: "Go to Dashboard",
  },
  resume: {
    route: "/resume",
    label: "Resume",
    icon: resumeIcon,
    title: "Go to Resume",
  },
};

const settingsOptions = {
  account: {
    route: "/settings/account",
    label: "Account",
    icon: accountIcon,
    title: "Go to Account Settings",
  },
  accessibility: {
    route: "/settings/accessibility",
    label: "Accessibility",
    icon: accessibilityIcon,
    title: "Go to Accessibility Settings",
  },
  notification: {
    route: "/settings/notification",
    label: "Notification",
    icon: notificationIcon,
    title: "Go to Notification Settings",
  },
  quit: { route: "/", label: "Quit", icon: quitIcon, title: "Logout" },
};

export function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedButton, setSelectedButton] = useState<string>("");

  const [navIsHovered, setNavIsHovered] = useState<boolean>(false);

  const [hoverMode, setHoverMode] = useState<
    "hover" | "locked-open" | "locked-closed"
  >("hover");

  useEffect(() => {
    // Update selected button based on current path
    const path = location.pathname;

    if (path === "/home") {
      setSelectedButton("home");
    } else if (path === "/auth-about") {
      setSelectedButton("about");
    } else if (path === "/dashboard") {
      setSelectedButton("dashboard");
    } else if (path === "/resume") {
      setSelectedButton("resume");
    } else if (path === "/settings/account") {
      setSelectedButton("account");
    } else if (path === "/settings/accessibility") {
      setSelectedButton("accessibility");
    } else if (path === "/settings/notification") {
      setSelectedButton("notification");
    } else setSelectedButton("");
  }, [location.pathname]);

  const handleButtonClick = async (route: string, buttonId: string) => {
    setSelectedButton(buttonId);
    if (route === "/") {
      console.log("Logging out...");
      await api("/api/auth/logout", { method: "POST" });
      await logOut();
    }
    navigate(route);
  };

  const restWidthMap = {
    "locked-closed": "6rem",
    hover: "6rem",
    "locked-open": "15rem",
  };

  const hoverWidthMap = {
    "locked-closed": "6rem",
    hover: "15rem",
    "locked-open": "15rem",
  };

  return (
    <div className="h-screen min-page-width overflow-x-hidden">
      <MainHeader />

      <div className={`app-content`}>
        <nav
          className={`flex absolute left-0 top-0  h-full primary-color animate-element`}
        >
          <motion.div
            className="z-50 h-full flex flex-col py-4 items-left justify-center gap-3 overflow-hidden"
            variants={{
              rest: { width: restWidthMap[hoverMode] },
              hover: { width: hoverWidthMap[hoverMode] },
            }}
            initial="rest"
            animate={navIsHovered ? "hover" : "rest"}
            onMouseEnter={() => setNavIsHovered(true)}
            onMouseLeave={() => setNavIsHovered(false)}
            transition={{
              duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
            }}
          >
            <div className="flex flex-col items-left h-full w-full justify-between group-hover:items-start">
              <section aria-label="Navigation Buttons">
                <ul
                  className="flex flex-col items-start gap-2"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  {Object.entries(primaryOptions).map(([key, option]) => (
                    <li key={key}>
                      <NavButton
                        icon={option.icon}
                        label={option.label}
                        onClick={() => handleButtonClick(option.route, key)}
                        isSelected={selectedButton === key}
                        hoverMode={hoverMode}
                        title={option.title}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="Settings and account">
                <div className="w-full p-2">
                  <small className="secondary-text whitespace-nowrap">
                    Settings
                  </small>
                  <hr className="header-split" />
                </div>
                <ul
                  className="flex flex-col items-start gap-2"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  <li key="theme-toggle">
                    <ThemeToggleButton hoverMode={hoverMode} />
                  </li>
                  <li key="menu-expand">
                    <MenuToggleButton
                      hoverMode={hoverMode}
                      setHoverMode={setHoverMode}
                    />
                  </li>
                  {Object.entries(settingsOptions).map(([key, option]) => (
                    <li key={key}>
                      <NavButton
                        icon={option.icon}
                        label={option.label}
                        onClick={() => handleButtonClick(option.route, key)}
                        isSelected={selectedButton === key}
                        hoverMode={hoverMode}
                        title={option.title}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </motion.div>
        </nav>
        <motion.div
          className="overflow-auto w-full h-full"
          variants={{
            rest: { marginLeft: restWidthMap[hoverMode] },
            hover: { marginLeft: hoverWidthMap[hoverMode] },
          }}
          animate={navIsHovered ? "hover" : "rest"}
          transition={{
            duration: parseFloat(getCSSVar("--animation-duration")) || 0.2,
          }}
          style={{ background: "var(--page-gradient)" }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
