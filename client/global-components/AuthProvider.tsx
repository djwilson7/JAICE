// import { localfiles } from "@/directory/path/to/localimport";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { observeUser } from "../global-services/auth";
import type { User } from "firebase/auth";
import { updateProfile } from "firebase/auth";

// Define the shape of the authentication context
type AuthCtx = { user: User | null; loading: boolean; applyProfileUpdate: (displayName?: string, photoUrl?: string) => Promise<void>; };

// Create a global context for authentication
const Ctx = createContext<AuthCtx>({ user: null, loading: true, applyProfileUpdate: async () => {} });

// Custom hook to access the authentication context
export const useAuth = () => useContext(Ctx);

// AuthProvider component to manage and provide authentication state
export default function AuthProvider({ children }: { children: ReactNode }) {
    // Store user and loading state (or null if not logged in)
    const [user, setUser] = useState<User | null>(null);
    // Track loading state while checking authentication status
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to authentication state changes
        // The observer will call the callback with the current user or null
        return observeUser((u) => {
            setUser(u);
            setLoading(false);
        });
    }, []);

    const applyProfileUpdate = async (displayName?: string, photoUrl?: string) => {
        const userToUpdate = user;
        if (!userToUpdate) {
            throw new Error("No user is currently logged in.");
        }

        try {
            await updateProfile(userToUpdate, {
                displayName: displayName,
                photoURL: photoUrl
            });

            await userToUpdate.reload();            
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    }
    // Provide the user and loading state to child components
    return <Ctx.Provider value={{ user, loading, applyProfileUpdate }}>{children}</Ctx.Provider>;
}

