/**
 * Auth Context – Web version (no AppState, no Keychain)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { User } from "../types/auth.types";
import { initializeAuth, removeTokens } from "../services/auth.service";
import { authEvents } from "../utils/authEvents";

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  checkAuth: () => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUserState] = useState<User | null>(null);

  const USER_KEY = "smart_clinic_user";

  const checkAuth = () => {
    try {
      setIsLoading(true);
      const { isAuthenticated: authStatus } = initializeAuth();

      if (authStatus) {
        const userJson = localStorage.getItem(USER_KEY);
        if (userJson) {
          setUserState(JSON.parse(userJson));
          setIsAuthenticated(true);
        } else {
          logout();
        }
      } else {
        setIsAuthenticated(false);
        setUserState(null);
      }
    } catch {
      setIsAuthenticated(false);
      setUserState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const setUser = (userData: User | null) => {
    setUserState(userData);
    setIsAuthenticated(userData !== null);
  };

  const logout = () => {
    removeTokens();
    localStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setUserState(null);
  };

  useEffect(() => {
    checkAuth();

    // Subscribe to auth errors (e.g. 401 from API)
    const unsubscribe = authEvents.subscribe(() => {
      logout();
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated, user, checkAuth, setUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
