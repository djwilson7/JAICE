// import { localfiles } from "@/directory/path/to/localimport";
import { NavButton } from "../nav-components/NavButton";
import { ThemeToggleButton } from "../nav-components/ThemeToggleButton";
import { MenuToggleButton } from "../nav-components/MenuToggleButton";

import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/global-components/AuthProvider";
import { logOut } from "@/global-services/auth";
// Icons
import homeIcon from "@/assets/icons/home.svg";
import aboutIcon from "@/assets/icons/book-open-cover.svg";
import dashboardIcon from "@/assets/icons/chart-pie-alt.svg";
import accountIcon from "@/assets/icons/user.svg";
import accessibilityIcon from "@/assets/icons/hand-paper.svg";
import notificationIcon from "@/assets/icons/bell-notification-social-media.svg";
import quitIcon from "@/assets/icons/user-logout.svg";
import searchIcon from "@/assets/icons/search.svg";

import { getCSSVar } from "@/utils/getCSSVar";
import resumeIcon from "@/assets/icons/resume.svg";

import { motion } from "framer-motion";
import { api } from "@/global-services/api";
import { useBrandImage } from "@/global-services/useBrandImage";

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

  const animationDuration =
    parseFloat(getCSSVar("--animation-duration")) || 0.2;

  const [hoverMode, setHoverMode] = useState<
    "hover" | "locked-open" | "locked-closed"
  >("hover");

  const brandImg = useBrandImage();

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

  const { user } = useAuth();
  const profilePic = user?.photoURL;
  const firstName = user?.displayName?.split(" ")[0] || null;
  const lastName = user?.displayName?.split(" ").slice(1).join(" ") || null;
  const headerEmail = user?.email?.toString() || null;

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
      <motion.header
        className={`app-header z-500`}
        initial="rest"
        transition={{ duration: animationDuration }}
      >
        <div className={`flex w-full h-full items-center justify-center gap-4`}>
          <div className="flex items-center gap-4 w-1/4 h-full">
            <div className="profile-picture">
              {profilePic ? (
                <img
                  src={profilePic}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-full border-2 border-[var(--color-blue-3)]"
                />
              ) : (
                <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-xl font-bold">
                    {firstName?.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <h2 className="text-2xl text-left font-bold primary-text line-clamp-1">
                {firstName} {lastName}
              </h2>
              <small className="text-left secondary-text line-clamp-1">
                {headerEmail}
              </small>
              <small className="text-left secondary-text line-clamp-1">
                Fresh Starter
              </small>
            </div>
          </div>
          <div className="flex w-1/2 h-full justify-center items-center">
            <div className="brandIcon">
              <img src={brandImg} alt="JAICE" className="object-cover" />
            </div>
            <h2 className="">Simplify Your Job Hunt</h2>
          </div>
          <div className="flex w-1/4 h-full justify-center items-center">
            <div className="relative w-full ">
              <input
                type="text"
                placeholder="Search..."
                className="px-4 py-2 pl-10 rounded-lg border border-[var(--color-blue-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-3)] focus:border-transparent w-full"
              />

              <img
                src={searchIcon}
                alt="Search"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 icon"
              />
            </div>
          </div>
        </div>
      </motion.header>

      <div className={`app-content`}>
        <nav
          className={`flex absolute left-0 top-0  h-full primary-color hidden md:block animate-element`}
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
            transition={{ duration: animationDuration }}
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
          transition={{ duration: animationDuration }}
          style={{ background: "var(--page-gradient)" }}
        >
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
}
