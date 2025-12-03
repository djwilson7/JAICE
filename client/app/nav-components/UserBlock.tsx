import { useAuth } from "@/global-components/AuthProvider";

export function UserBlock({}) {
  const { user } = useAuth();
  const profilePic = user?.photoURL;
  const firstName = user?.displayName?.split(" ")[0] || null;
  const lastName = user?.displayName?.split(" ").slice(1).join(" ") || null;
  const headerEmail = user?.email?.toString() || null;

  return (
    <div className="user-block">
        <div className="profile-picture-container animate-element">
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
        </div>

        <div className="text-container animate-element">
          <div className="user-name animate-element text-lg md:text-xl lg:text-2xl">
            {firstName} {lastName}
          </div>
          <div className="secondary-text animate-element secondary-info text-sm">
            {headerEmail}
          </div>
          <div className="secondary-text animate-element secondary-info text-md">
            Fresh Starter
          </div>
        </div>
    </div>
  );
}
