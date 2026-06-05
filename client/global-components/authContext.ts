import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthCtx = {
  user: User | null;
  loading: boolean;
  applyProfileUpdate: (
    displayName?: string,
    photoUrl?: string
  ) => Promise<void>;
};

export const AuthContext = createContext<AuthCtx>({
  user: null,
  loading: true,
  applyProfileUpdate: async () => {},
});

export const useAuth = () => useContext(AuthContext);
