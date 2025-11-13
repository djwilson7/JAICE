// import { localfiles } from "@/directory/path/to/localimport";
import Button from "@/global-components/button";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {auth} from "@/global-services/firebase"

// Icons
import homeIcon from "@/assets/icons/home.svg";
import aboutIcon from "@/assets/icons/book-open-cover.svg";
import dashboardIcon from "@/assets/icons/chart-pie-alt.svg";
import accountIcon from "@/assets/icons/user.svg";
import accessibilityIcon from "@/assets/icons/hand-paper.svg";
import notificationIcon from "@/assets/icons/bell-notification-social-media.svg";
import quitIcon from "@/assets/icons/user-logout.svg";
import searchIcon from "@/assets/icons/search.svg";

export function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedButton, setSelectedButton] = useState<string>("");

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

  function usernameFromEmail(email?: string | null) {
  if (!email) return "";
  const local = email.split("@")[0];       // before @
  const noTag = local.split("+")[0];       // drop +anything
  // turn dots/underscores into spaces and Title Case it
  return noTag
    .replace(/[._-]+/g, " ")
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

const HeaderUserName = usernameFromEmail(auth.currentUser?.email);
const HeaderEmail = auth.currentUser?.email?.toString();



  return (
    <div className="ml-[5rem] h-screen overflow-x-hidden"> 
      <nav className="absolute left-0 h-screen">
        <div className="fixed z-200 group left-0 w-[5rem] hover:w-[15rem] h-full bg-[var(--color-blue-1)] flex flex-col items-center p-2 gap-2 shadow-md">
          {/* Title */}
          <header>
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-title)" }}
            >
                <div className="flex flex-col items-center gap-2">
                      <img
                        src="/JAICE_logo.png"
                        alt="JAICE"
                        className="w-17 h-17 group-hover:w-30 group-hover:h-30 flex-shrink-0 transition-all duration-200"
                      />
                      <span className="hidden group-hover:inline text-2xl">Simplify Your Job Hunt</span>
                    </div>
            </h1>
          </header>

          <hr className="w-full border-t-2 border-gray-400 my-2" />

          <div className="flex flex-col items-center h-full w-full justify-between group-hover:items-start">
            {/* Navigation Buttons */}
            <section aria-label="Navigation Buttons">
              <ul
                className="flex flex-col items-start gap-2"
                style={{ fontFamily: "var(--font-subheading)" }}
              >
                <li>
                  <Button
                    onClick={() => handleButtonClick("/home", "home")}
                    isSelected={selectedButton === "home"}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={homeIcon}
                        alt="Home"
                        className="w-5 h-5 flex-shrink-0"
                      />{" "}
                      {/* when not hovered (flex-shrink-0 makes the icon not shrink when not hovered) */}
                      <span className="hidden group-hover:inline">Home</span>{" "}
                      {/* when hovered */}
                    </div>
                  </Button>
                </li>

                <li>
                  <Button
                    onClick={() => handleButtonClick("/auth-about", "about")}
                    isSelected={selectedButton === "about"}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={aboutIcon}
                        alt="About"
                        className="w-5 h-5 flex-shrink-0"
                      />{" "}
                      {/* when not hovered */}
                      <span className="hidden group-hover:inline">
                        About
                      </span>{" "}
                      {/* when hovered */}
                    </div>
                  </Button>
                </li>

                <li>
                  <Button
                    onClick={() => handleButtonClick("/dashboard", "dashboard")}
                    isSelected={selectedButton === "dashboard"}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={dashboardIcon}
                        alt="Dashboard"
                        className="w-5 h-5 flex-shrink-0"
                      />{" "}
                      {/* when not hovered */}
                      <span className="hidden group-hover:inline">
                        Dashboard
                      </span>{" "}
                      {/* when hovered */}
                    </div>
                  </Button>
                </li>
              </ul>
            </section>

            {/* Settings and Account Buttons */}
            <section aria-label="Settings and account">
              <ul
                className="flex flex-col items-start gap-2"
                style={{ fontFamily: "var(--font-subheading)" }}
              >
                <li>
                  <Button
                    onClick={() =>
                      handleButtonClick("/settings/account", "account")
                    }
                    isSelected={selectedButton === "account"}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={accountIcon}
                        alt="Account"
                        className="w-5 h-5 flex-shrink-0"
                      />{" "}
                      {/* when not hovered  */}
                      <span className="hidden group-hover:inline">
                        Account
                      </span>{" "}
                      {/* when hovered */}
                    </div>
                  </Button>
                </li>

                <li>
                  <Button
                    onClick={() =>
                      handleButtonClick(
                        "/settings/accessibility",
                        "accessibility"
                      )
                    }
                    isSelected={selectedButton === "accessibility"}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={accessibilityIcon}
                        alt="Accessibility"
                        className="w-5 h-5 flex-shrink-0"
                      />{" "}
                      {/* when not hovered */}
                      <span className="hidden group-hover:inline">
                        Accessibility
                      </span>{" "}
                      {/* when hovered */}
                    </div>
                  </Button>
                </li>

                <li>
                  <Button
                    onClick={() =>
                      handleButtonClick(
                        "/settings/notification",
                        "notification"
                      )
                    }
                    isSelected={selectedButton === "notification"}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={notificationIcon}
                        alt="Notification"
                        className="w-5 h-5 flex-shrink-0"
                      />{" "}
                      {/* when not hovered */}
                      <span className="hidden group-hover:inline">
                        Notification
                      </span>{" "}
                      {/* when hovered */}
                    </div>
                  </Button>
                </li>

                <li>
                  <Button
                    onClick={() => handleButtonClick("/", "quit")}
                    isSelected={selectedButton === "quit"}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={quitIcon}
                        alt="Quit"
                        className="w-5 h-5 flex-shrink-0"
                      />{" "}
                      {/* when not hovered */}
                      <span className="hidden group-hover:inline">
                        Quit
                      </span>{" "}
                      {/* when hovered */}
                    </div>
                  </Button>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </nav>
      
      {/* Header */}
      <header className="p-7 bg-[var(--color-blue-1)] shadow-md sticky top-0 z-100">
        <div className="flex items-start justify-between">

          {/* account picture and name */}
          <div className="flex items-center gap-3 ml-[10rem]">

            {/* picture placeholder */}
            <div  className="w-30 h-30 rounded-full bg-gray-600"></div>

              {/* name placeholder */}
            <div className="flex flex-col text-white ">
              <h2 className="text-2xl text-left">{HeaderUserName}</h2>
              <h3 className="text-lg text-gray-300 text-left">{HeaderEmail}</h3>
              <h3 className="text-lg text-gray-300 text-left">Fresh Starter</h3>

            </div>
          </div>

          {/*search bar */}
          <div className="flex items-start mr-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="px-4 py-2 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-96"
              />

              {/* search icon inside the input field */}
              <img
                src={searchIcon}
                alt="Search"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"

                // changes the color of  the icon
                style={{ filter: 'brightness(0) saturate(100%) invert(60%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(70%) contrast(90%)' }}   
              />
            </div>
          </div>
        </div>

      </header>
      <div className="overflow-x-auto">
        <Outlet />
      </div>
    </div>
  );
}
