// import { localfiles } from "@/directory/path/to/localimport";
import Button from "@/global-components/button";
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

import openMenuIcon from "@/assets/icons/openMenuIcon.svg";
import closeMenuIcon from "@/assets/icons/closedMenuIcon.svg";
import hoverMenuIcon from "@/assets/icons/hoverMenuIcon.svg";

import { getCSSVar } from "@/utils/getCSSVar";
import resumeIcon from "@/assets/icons/resume.svg";
import sunIcon from "@/assets/icons/sun.svg";
import moonIcon from "@/assets/icons/moon.svg";
import halfCircleIcon from "@/assets/icons/half-circle.svg";

import { motion } from "framer-motion";
import { api } from "@/global-services/api";
import { useBrandImage } from "@/global-services/useBrandImage";

function useThemeIcon() {
  const computeThemeIcon = () => {
    const theme = document.documentElement.getAttribute("data-theme");
    const contrast = document.documentElement.getAttribute("data-contrast");
    if (contrast === "bw") {
      return halfCircleIcon;
    }
    return theme === "light" ? sunIcon : moonIcon;
  };

  const [themeIcon, setThemeIcon] = useState<string>(computeThemeIcon());

  useEffect(() => {
    const updateIcon = () => setThemeIcon(computeThemeIcon());

    updateIcon();

    window.addEventListener("appearancechange", updateIcon);

    return () => {
      window.removeEventListener("appearancechange", updateIcon);
    };
  }, []);

  return themeIcon;
}

const ThemeToggleButton = ({
  hoverMode,
}: {
  hoverMode: "hover" | "locked-open" | "locked-closed";
}) => {
  const themeIcon = useThemeIcon();
  const titleText =
    themeIcon === moonIcon ? "Flip to Light Mode" : "Flip to Dark Mode";

  const handleThemeToggle = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const currentContrast =
      document.documentElement.getAttribute("data-contrast");

    if (currentContrast === "bw") {
      const newTheme = "dark";
      const newContrast = "high";

      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.setAttribute("data-contrast", newContrast);
      window.dispatchEvent(new Event("appearancechange"));
      return;
    }

    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", newTheme);

    const event = new Event("appearancechange");
    window.dispatchEvent(event);
  };

  const iconLabelMap = {
    [sunIcon]: "Light Mode",
    [moonIcon]: "Dark Mode",
    [halfCircleIcon]: "B/W Contrast Mode",
  };

  const buttonLabel = iconLabelMap[themeIcon] ?? "Mode";

  return (
    <NavButton
      icon={themeIcon}
      label={buttonLabel}
      onClick={handleThemeToggle}
      isSelected={false}
      hoverMode={hoverMode}
      title={titleText}
    />
  );
};

// Adding a perm lock to the hover state, so user can keep the menu closed on hover as well.
// So always open, always closed, or hover to open.
const MenuExpandButton = ({
  hoverMode,
  setHoverMode,
}: {
  hoverMode: "hover" | "locked-open" | "locked-closed";
  setHoverMode: (value: "hover" | "locked-open" | "locked-closed") => void;
}) => {
  const menuIconMap = {
    "locked-closed": closeMenuIcon,
    hover: hoverMenuIcon,
    "locked-open": openMenuIcon,
  };

  const handleHoverModeToggle = () => {
    if (hoverMode === "locked-closed") {
      setHoverMode("hover");
    } else if (hoverMode === "hover") {
      setHoverMode("locked-open");
    } else {
      setHoverMode("locked-closed");
    }
  };

  const iconLabelMap = {
    "locked-closed": "Always Closed",
    hover: "Hover Mode",
    "locked-open": "Always Open",
  };

  const titleMap = {
    "locked-closed": "Flip to Hover Mode",
    hover: "Flip to Always Open",
    "locked-open": "Flip to Always Closed",
  };

  return (
    <NavButton
      onClick={handleHoverModeToggle}
      isSelected={false}
      label={iconLabelMap[hoverMode]}
      icon={menuIconMap[hoverMode]}
      hoverMode={hoverMode}
      title={titleMap[hoverMode]}
    />
  );
};

const NavButton = ({
  icon,
  label,
  onClick,
  isSelected,
  hoverMode,
  title,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  isSelected: boolean;
  hoverMode: "hover" | "locked-open" | "locked-closed";
  title?: string;
}) => {

  const hoverModeRestMap = {
    "locked-closed": false,
    hover: false,
    "locked-open": true,
  };

  const hoverModeLabelOpacityMap = {
    "locked-closed": 0,
    "hover": 1,
    "locked-open": 1,
  };

  return (
    <div className="flex flex-row items-center gap-2">
      <Button
        onClick={onClick}
        isSelected={isSelected}
        className="navButton"
        title={title}
      >
        <div className="flex items-center">
          <img src={icon} alt={label} className="w-5 h-5 flex-shrink-0 icon" />
        </div>
      </Button>
      <motion.span
        className="text-left overflow-hidden whitespace-nowrap"
        style={{
          height: "1.25rem",
          display: "flex",
          alignItems: "center",
        }}
        variants={{
          rest: { opacity: hoverModeRestMap[hoverMode] ? 1 : 0 },
          hover: { opacity: hoverModeLabelOpacityMap[hoverMode] },
        }}
        transition={{ duration: 0.15 }}
      >
        {label}
      </motion.span>
    </div>
  );
};

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
    "hover": "6rem",
    "locked-open": "15rem",
  };

  const hoverWidthMap = {
    "locked-closed": "6rem",
    "hover": "15rem",
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
              <caption className="text-left secondary-text line-clamp-1">
                Fresh Starter
              </caption>
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
        <nav className={`flex absolute left-0 top-0  h-full primary-color`}>
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
                    <MenuExpandButton
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
