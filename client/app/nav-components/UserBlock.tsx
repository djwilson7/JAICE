import { useAuth } from "@/global-components/authContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGritScore } from "@/utils/useGritScore";
import userIcon from "@/assets/icons/user.svg";
import { IS_DEMO_MODE } from "@/global-services/projectMode";

export function UserBlock() {
  const { user } = useAuth();
  const { tier, tierColor, loading } = useGritScore();
  const profilePic = user?.photoURL;
  const firstName = user?.displayName?.split(" ")[0] || null;
  const lastName = user?.displayName?.split(" ").slice(1).join(" ") || null;
  const navigate = useNavigate();

  return (
    <div
      className={`user-block ${IS_DEMO_MODE ? "user-block-disabled" : ""}`}
      aria-disabled={IS_DEMO_MODE}
      inert={IS_DEMO_MODE ? true : undefined}
      onClickCapture={IS_DEMO_MODE ? (event) => {
        event.preventDefault();
        event.stopPropagation();
      } : undefined}
    >
      <motion.div
        className="profile-picture-container profile-picture-frame animate-element h-8 w-8 md:h-9 md:w-9 lg:h-10 lg:w-10"
        onClick={() => navigate("/settings")}
        whileHover={IS_DEMO_MODE ? undefined : { cursor: "pointer", scale: 1.04 }}
        title="Change your profile picture in account settings."
      >
        <img
          key={profilePic || "default-profile"}
          src={profilePic || userIcon}
          alt="Profile"
          className="h-full w-full rounded-full object-cover profile-picture animate-element"
          onError={(event) => {
            event.currentTarget.src = userIcon;
          }}
        />
      </motion.div>

      <div className="text-container animate-element">
        <motion.div 
          onClick={() => navigate("/settings")}
          className="user-name animate-element text-xs leading-tight md:text-sm lg:text-base"
          whileHover={IS_DEMO_MODE ? undefined : { cursor: "pointer", scale: 1.04 }}
          title="View and edit your name in account settings."
        >
          {firstName} {lastName}
        </motion.div>
        <motion.div 
          className="secondary-text animate-element secondary-info text-[0.65rem] leading-tight md:text-xs"
          whileHover={IS_DEMO_MODE ? undefined : { cursor: "pointer", scale: 1.04 }}
          title="Check out your dashboard."
          onClick={() => navigate("/dashboard")}
          style={{ color: tierColor, fontWeight: 600 }}
        >
          {loading ? "Loading..." : tier}
        </motion.div>
      </div>
    </div>
  );
}
