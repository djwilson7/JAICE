import { NavButton } from "../nav-components/NavButton";
import { ThemeToggleButton } from "../nav-components/ThemeToggleButton";

import { MainHeader } from "@/app/nav-components/MainHeader";

import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { logOut } from "@/global-services/auth";

// Icons
import homeIcon from "@/assets/icons/home.svg";
import aboutIcon from "@/assets/icons/book-open-cover.svg";
import dashboardIcon from "@/assets/icons/chart-pie-alt.svg";
import accountIcon from "@/assets/icons/user.svg";
import displayIcon from "@/assets/icons/display.svg";
//import notificationIcon from "@/assets/icons/bell-notification-social-media.svg";
import quitIcon from "@/assets/icons/user-logout.svg";

import resumeIcon from "@/assets/icons/resume.svg";

import { motion } from "framer-motion";
import { api } from "@/global-services/api";
import type { NavigationBehavior } from "@/pages/settings/provider/settingsTypes";
import { useSettings } from "@/pages/settings/provider/settingsContext";

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
  display: {
    route: "/settings/display",
    label: "Display",
    icon: displayIcon,
    title: "Go to Display Settings",
  },
  // notification: {
  //   route: "/settings/notification",
  //   label: "Notification",
  //   icon: notificationIcon,
  //   title: "Go to Notification Settings",
  // },
  quit: { route: "/", label: "Quit", icon: quitIcon, title: "Logout" },
};

const navLabels = [
  ...Object.values(primaryOptions).map((option) => option.label),
  ...Object.values(settingsOptions).map((option) => option.label),
  "Light Mode",
  "Dark Mode",
  "Black and White",
];

const longestNavLabelLength = Math.max(
  ...navLabels.map((label) => label.length)
);

const NAV_CLOSED_WIDTH = "3rem";
const navLabelWidthCh = longestNavLabelLength * 0.61;

const NAV_WIDTHS = {
  closed: NAV_CLOSED_WIDTH,
  open: `calc(${NAV_CLOSED_WIDTH} + ${navLabelWidthCh}ch + 0.625rem)`,
};

export function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedButton, setSelectedButton] = useState<string>("");

  const [navIsHovered, setNavIsHovered] = useState<boolean>(false);

  const hoverMode = useSettings().navigationBehavior as NavigationBehavior;

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
    } else if (path === "/settings/display") {
      setSelectedButton("display");
    // } else if (path === "/settings/notification") {
    //   setSelectedButton("notification");
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

  const isNavExpanded = hoverMode === "open" || (hoverMode === "hover" && navIsHovered);
  const targetNavWidth = isNavExpanded ? NAV_WIDTHS.open : NAV_WIDTHS.closed;
  const navTransition = {
    type: "spring" as const,
    stiffness: 260,
    damping: 32,
    mass: 0.9,
  };

  return (
    <div className="h-screen min-page-width overflow-x-hidden">
      <MainHeader />

      <div className={`app-content`}>
        <motion.nav
          className={`flex absolute left-0 top-0 h-full primary-color z-40`}
          id="navigation-bar"
          animate={{ width: targetNavWidth }}
          transition={navTransition}
          onMouseEnter={() => setNavIsHovered(true)}
          onMouseLeave={() => setNavIsHovered(false)}
        >
          <motion.div
            className="z-50 h-full w-full flex flex-col gap-1.5 overflow-hidden p-1.5"
            layout
            transition={navTransition}
          >
            <div className="flex flex-col h-full w-full justify-between">
              <section aria-label="Navigation Buttons" className="flex w-full">
                <ul
                  className="flex w-full flex-col items-center gap-1"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  {Object.entries(primaryOptions).map(([key, option]) => (
                    <li key={key} className="w-full">
                      <NavButton
                        icon={option.icon}
                        label={option.label}
                        onClick={() => handleButtonClick(option.route, key)}
                        isSelected={selectedButton === key}
                        hoverMode={hoverMode}
                        title={option.title}
                        showLabel={navIsHovered && hoverMode !== "closed"}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="Settings and account">
                <div className="flex w-full flex-col items-center justify-center overflow-hidden p-1.5">
                  <motion.small
                    className="w-full whitespace-nowrap text-center text-[0.625rem] font-light leading-none secondary-text"
                    animate={{ opacity: isNavExpanded ? 1 : 0 }}
                    transition={navTransition}
                  >
                    Settings
                  </motion.small>
                  <hr className="header-split" />
                </div>
                <ul
                  className="flex w-full flex-col items-center gap-1"
                  style={{ fontFamily: "var(--font-subheading)" }}
                >
                  <li key="theme-toggle" className="w-full">
                    <ThemeToggleButton
                      hoverMode={hoverMode}
                      showLabel={navIsHovered && hoverMode !== "closed"}
                    />
                  </li>
                  {/* <li key="menu-expand">
                    <MenuToggleButton
                      hoverMode={hoverMode}
                      setHoverMode={setHoverMode}
                    />
                  </li> This no longer exists, now we react to state instead*/}
                  {Object.entries(settingsOptions).map(([key, option]) => (
                    <li key={key} className="w-full">
                      <NavButton
                        icon={option.icon}
                        label={option.label}
                        onClick={() => handleButtonClick(option.route, key)}
                        isSelected={selectedButton === key}
                        hoverMode={hoverMode}
                        title={option.title}
                        showLabel={navIsHovered && hoverMode !== "closed"}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </motion.div>
        </motion.nav>
        <motion.div
          className="outlet-container"
          animate={{
            marginLeft: targetNavWidth,
            width: `calc(100vw - ${targetNavWidth})`,
          }}
          transition={navTransition}
          style={{ background: "var(--page-gradient)" }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
