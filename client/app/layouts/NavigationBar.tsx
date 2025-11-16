// import { localfiles } from "@/directory/path/to/localimport";
import Button from "@/global-components/button";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/global-components/AuthProvider";
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

import { motion } from "framer-motion";

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
      className="flex absolute top-0 left-0 m-2 z-201"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        margin: "0.5rem",
        zIndex: 201,
        height: "2rem",
        width: "2rem",
        padding: "0.5rem",
      }}
    >
      <img
        src={hoverEnabled ? compressIcon : expandIcon}
        alt={hoverEnabled ? "Compress" : "Expand"}
        className="object-fit aspect-square w-full h-full"
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
      <Button onClick={onClick} isSelected={isSelected}>
        <div className="flex items-center">
          <img src={icon} alt={label} className="w-5 h-5 flex-shrink-0" />
        </div>
      </Button>
      <motion.span
        className="text-white text-left overflow-hidden"
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
  const animationDuration = 0.2;
  const [hoverEnabled, setHoverEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Update selected button based on current path
    const path = location.pathname;

    if (path === "/home") {
      setSelectedButton("home");
    } else if (path === "/auth-about") {
      setSelectedButton("about");
    } else if (path === "/dashboard") {
      setSelectedButton("dashboard");
    } else if (path === "/settings/account") {
      setSelectedButton("account");
    } else if (path === "/settings/accessibility") {
      setSelectedButton("accessibility");
    } else if (path === "/settings/notification") {
      setSelectedButton("notification");
    } else setSelectedButton("");
  }, [location.pathname]);

  const handleButtonClick = (route: string, buttonId: string) => {
    setSelectedButton(buttonId);
    navigate(route);
  };

  const { user } = useAuth();
  const profilePic = user?.photoURL;
  const firstName = user?.displayName?.split(" ")[0] || null;
  const lastName = user?.displayName?.split(" ").slice(1).join(" ") || null;
  const headerEmail = user?.email?.toString() || null;
  const restWidth = hoverEnabled ? "5rem" : "15rem";

  return (
    <div className="h-screen overflow-x-hidden">
      <MenuExpandButton
        hoverEnabled={hoverEnabled}
        setHoverEnabled={setHoverEnabled}
      />
      {/* Navigation Bar */}
      <nav className="absolute left-0 h-screen">
        <motion.div
          className="fixed z-200 left-0 h-full bg-[var(--color-blue-1)] flex flex-col items-left justify-center p-1 gap-3 pt-10 shadow-md overflow-hidden"
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
              src="/JAICE_logo.png"
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
              className="text-2xl line-clamp-1 text-white text-left"
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

          <hr className="w-full border-t-2 border-gray-400" />

          <div className="flex flex-col items-left  h-full w-full justify-between group-hover:items-start">
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
        className="flex flex-row px-8 py-8 bg-[var(--color-blue-1)] shadow-md sticky top-0 z-100"
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
                  <span className="text-white text-xl font-bold">
                    {firstName?.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* name placeholder */}
            <div className="flex flex-col text-white">
              <h2 className="text-2xl text-left font-bold line-clamp-1">
                {firstName} {lastName}
              </h2>
              <small className="text-gray-300 text-left line-clamp-1">
                {headerEmail}
              </small>
              <caption className="text-gray-300 text-left line-clamp-1">
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
                className="px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />

              {/* search icon inside the input field */}
              <img
                src={searchIcon}
                alt="Search"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                // changes the color of  the icon
                style={{
                  filter:
                    "brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(70%) contrast(90%)",
                }}
              />
            </div>
          </div>
        </div>
      </motion.header>
      <motion.div
        className="overflow-x-auto"
        variants={{
          rest: { marginLeft: restWidth },
          hover: { marginLeft: "15rem" },
        }}
        animate={navIsHovered ? "hover" : "rest"}
        transition={{ duration: animationDuration }}
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
