import { useAuth } from "@/global-components/authContext";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useGritScore } from "@/utils/useGritScore";

export function UserBlock() {
  const { user } = useAuth();
  const { tier, tierColor, loading } = useGritScore();
  const profilePic = user?.photoURL;
  const firstName = user?.displayName?.split(" ")[0] || null;
  const lastName = user?.displayName?.split(" ").slice(1).join(" ") || null;
  const headerEmail = user?.email?.toString() || null;
  const navigate = useNavigate();

  return (
    <div className="user-block">
      <motion.div
        className="profile-picture-container animate-element"
        onClick={() => navigate("/settings/account")}
        whileHover={{ cursor: "pointer", scale: 1.04 }}
        title="Change your profile picture in account settings."
      >
        {profilePic ? (
          <img
            src={profilePic}
            alt="Profile"
            className="w-14 md:w-16 lg:w-18 profile-picture animate-element"
          />
        ) : (
          <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-xl font-bold">{firstName?.charAt(0)}</span>
          </div>
        )}
      </motion.div>

      <div className="text-container animate-element">
        <motion.div 
          onClick={() => navigate("/settings/account")}
          className="user-name animate-element text-lg md:text-xl lg:text-2xl"
          whileHover={{ cursor: "pointer", scale: 1.04 }}
          title="View and edit your name in account settings."
        >
          {firstName} {lastName}
        </motion.div>
        <motion.div 
          className="secondary-text animate-element secondary-info text-sm"
          whileHover={{ cursor: "pointer" }}
          title="The email associated with your account."
        >
          {headerEmail}
        </motion.div>
        <motion.div 
          className="secondary-text animate-element secondary-info text-md"
          whileHover={{ cursor: "pointer", scale: 1.04 }}
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
