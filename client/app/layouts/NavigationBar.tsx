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
import compressIcon from "@/assets/icons/compress.svg";
import expandIcon from "@/assets/icons/expand.svg";
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
  }

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
}: {}) => {

  const themeIcon = useThemeIcon();
  const handleThemeToggle = () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const currentContrast = document.documentElement.getAttribute("data-contrast");

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

  return (
    <button
      onClick={handleThemeToggle}
      className="z-201 right-8 cornerFloating"
    >
      <img
        src={themeIcon}
        alt="Theme Icon"
        className="icon"
      />
    </button>
  );
}

const MenuExpandButton = ({
  hoverEnabled,
  setHoverEnabled,
}: {
  hoverEnabled: boolean;
  setHoverEnabled: (value: boolean) => void;
}) => {
  return (
    <button
      onClick={() => setHoverEnabled(!hoverEnabled)}
      className="z-201 left-0 ml-2 cornerFloating"
    >
      <img
        src={hoverEnabled ? compressIcon : expandIcon}
        alt={hoverEnabled ? "Compress" : "Expand"}
        title={hoverEnabled ? "Keep Navigation Bar Expanded" : "Hover to Expand Navigation Bar"}
        className="icon"
      />
    </button>
  );
};

const NavButton = ({
  icon,
  label,
  onClick,
  isSelected,
  hoverEnabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  isSelected: boolean;
  hoverEnabled: boolean;
}) => {
  return (
    <div className="flex flex-row items-center gap-2">
      <Button onClick={onClick} isSelected={isSelected} className="navButton" >
        <div className="flex items-center">
          <img src={icon} alt={label} className="w-5 h-5 flex-shrink-0 icon" />
        </div>
      </Button>
      <motion.span
        className="text-left overflow-hidden"
        style={{
          height: "1.25rem",
          display: "flex",
          alignItems: "center",
        }}
        variants={{
          rest: { opacity: hoverEnabled ? 0 : 1 },
          hover: { opacity: 1 },
        }}
        transition={{ duration: 0.15 }}
      >
        {label}
      </motion.span>
    </div>
  );
};

const primaryOptions = {
  home: { route: "/home", label: "Home", icon: homeIcon },
  about: { route: "/auth-about", label: "About", icon: aboutIcon },
  dashboard: { route: "/dashboard", label: "Dashboard", icon: dashboardIcon },
  resume: { route: "/resume", label: "Resume", icon: resumeIcon },
};

const settingsOptions = {
  account: { route: "/settings/account", label: "Account", icon: accountIcon },
  accessibility: {
    route: "/settings/accessibility",
    label: "Accessibility",
    icon: accessibilityIcon,
  },
  notification: {
    route: "/settings/notification",
    label: "Notification",
    icon: notificationIcon,
  },
  quit: { route: "/", label: "Quit", icon: quitIcon },
};

export function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedButton, setSelectedButton] = useState<string>("");
  const [navIsHovered, setNavIsHovered] = useState<boolean>(false);
  const animationDuration =
    parseFloat(getCSSVar("--animation-duration")) || 0.2;
  const [hoverEnabled, setHoverEnabled] = useState<boolean>(true);

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
  const restWidth = hoverEnabled ? "6rem" : "15rem";

  return (
    <div className="h-screen relative overflow-x-hidden">
      <MenuExpandButton
        hoverEnabled={hoverEnabled}
        setHoverEnabled={setHoverEnabled}
      />
      <ThemeToggleButton />
      {/* Navigation Bar */}
      <nav className="absolute left-0 h-screen">
        <motion.div
          className="fixed primary-color z-200 left-0 h-full flex flex-col items-left justify-center gap-3 pt-10 pb-5 overflow-hidden"
          variants={{
            rest: { width: restWidth },
            hover: { width: "15rem" },
          }}
          initial="rest"
          animate={navIsHovered ? "hover" : "rest"}
          onMouseEnter={() => setNavIsHovered(true)}
          onMouseLeave={() => setNavIsHovered(false)}
          transition={{ duration: animationDuration }}
        >
          {/* Title */}
          <motion.header
            className="flex flex-col items-center gap-2"
            variants={{
              rest: {},
              hover: {},
            }}
          >
            <motion.img
              src={brandImg}
              alt="JAICE"
              className="h-17 flex-shrink-0 transition-all"
              style={{ objectFit: "contain" }}
              variants={{
                rest: { width: "5rem" },
                hover: { width: "15rem" },
              }}
              initial="rest"
              animate="rest"
              whileHover="hover"
              transition={{ duration: animationDuration }}
            />

            <motion.span
              className="text-2xl line-clamp-1 text-left"
              style={{ fontFamily: "var(--font-title)" }}
              variants={{
                rest: { opacity: hoverEnabled ? 0 : 1 },
                hover: { opacity: 1 },
              }}
              transition={{ duration: animationDuration }}
            >
              Simplify Your Job Hunt
            </motion.span>
          </motion.header>

          <hr className="header-split"/>

          <div className="flex flex-col items-left h-full w-full justify-between group-hover:items-start">
            {/* Primary Page Buttons*/}

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
                      hoverEnabled={hoverEnabled}
                    />
                  </li>
                ))}
              </ul>
            </section>

            {/* Settings Buttons */}
            <section aria-label="Settings and account">
              <ul
                className="flex flex-col items-start gap-2"
                style={{ fontFamily: "var(--font-subheading)" }}
              >
                {Object.entries(settingsOptions).map(([key, option]) => (
                  <li key={key}>
                    <NavButton
                      icon={option.icon}
                      label={option.label}
                      onClick={() => handleButtonClick(option.route, key)}
                      isSelected={selectedButton === key}
                      hoverEnabled={hoverEnabled}
                    />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </motion.div>
      </nav>

      {/* Header */}
      <motion.header
        className="flex flex-row px-8 py-8 primary-color sticky top-0 z-100 shadow"
        variants={{
          rest: { marginLeft: restWidth },
          hover: { marginLeft: "15rem" },
        }}
        initial="rest"
        animate={navIsHovered ? "hover" : "rest"}
        transition={{ duration: animationDuration }}
      >
        <div className="flex w-full h-full items-center justify-between gap-4">
          {/* account picture and name */}
          <div className="flex items-center gap-4 w-1/2 h-full">
            {/* picture placeholder or first char of first name */}
            <div className="w-20 h-20 rounded-full bg-gray-600">
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

            {/* name placeholder */}
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

          {/*search bar */}
          <div className="flex w-1/2 h-full justify-end">
            <div className="relative w-full lg:w-1/2">
              <input
                type="text"
                placeholder="Search..."
                className="px-4 py-2 pl-10 rounded-lg border border-[var(--color-blue-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-3)] focus:border-transparent w-full"
              />

              {/* search icon inside the input field */}
              <img
                src={searchIcon}
                alt="Search"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 icon"
              />
            </div>
          </div>
        </div>
      </motion.header>
      <motion.div
        className="overflow-x-auto shadow-inner min-h-[calc(100vh-8rem)]"
        variants={{
          rest: { marginLeft: restWidth },
          hover: { marginLeft: "15rem" },
        }}
        animate={navIsHovered ? "hover" : "rest"}
        transition={{ duration: animationDuration }}
        style={{ background: "var(--page-gradient)" }}
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
