"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import {
  BACKEND_URL,
  storeTokens,
  clearTokens,
  logoutSession,
  setOnUnauthorized,
} from "../api/client";
import { LoginDialog } from "../components/login-dialog";

interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_REQUIRED = process.env.NEXT_PUBLIC_AUTH_REQUIRED === "true";

const localBackendUser: User = {
  id: "local-backend",
  username: "local-backend",
  displayName: "Local Backend",
  email: "local-backend@localhost",
  role: "operator",
};

function initialAuthState(): {
  user: User | null;
  token: string | null;
  ready: boolean;
  showLogin: boolean;
} {
  if (!AUTH_REQUIRED) {
    return { user: localBackendUser, token: null, ready: true, showLogin: false };
  }

  if (typeof window === "undefined") {
    return { user: null, token: null, ready: false, showLogin: false };
  }

  const stored = localStorage.getItem("accessToken");
  const storedUser = localStorage.getItem("user");
  if (!stored || !storedUser) {
    return { user: null, token: null, ready: true, showLogin: true };
  }

  try {
    return {
      user: JSON.parse(storedUser) as User,
      token: stored,
      ready: true,
      showLogin: false,
    };
  } catch {
    clearTokens();
    return { user: null, token: null, ready: true, showLogin: true };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [initialState] = useState(initialAuthState);
  const [user, setUser] = useState<User | null>(initialState.user);
  const [token, setToken] = useState<string | null>(initialState.token);
  const [ready] = useState(initialState.ready);
  const [showLogin, setShowLogin] = useState(initialState.showLogin);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logout = useCallback(async () => {
    if (AUTH_REQUIRED) {
      await logoutSession();
    }
    clearTokens();
    setToken(null);
    setUser(null);
    if (AUTH_REQUIRED) {
      setShowLogin(true);
    } else {
      setUser(localBackendUser);
      setShowLogin(false);
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  const login = useCallback(
    async (username: string, password: string) => {
      if (!AUTH_REQUIRED) {
        setUser(localBackendUser);
        setShowLogin(false);
        return;
      }

      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const tokenRes = await fetch(`${BACKEND_URL}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });

      if (!tokenRes.ok) {
        if (tokenRes.status === 401 || tokenRes.status === 422) {
          throw new Error("Invalid username or password");
        }
        throw new Error(`Login failed: ${tokenRes.status}`);
      }

      const tokenData = await tokenRes.json();
      const accessToken: string = tokenData.accessToken;
      const refreshToken: string = tokenData.refreshToken;

      storeTokens(accessToken, refreshToken);
      setToken(accessToken);

      const meRes = await fetch(`${BACKEND_URL}/api/users/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!meRes.ok) {
        throw new Error("Failed to fetch user profile");
      }

      const profile = await meRes.json();
      const userData: User = {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.email,
        role: profile.role,
      };

      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      setShowLogin(false);
    },
    [],
  );

  const authenticated = ready && !!user && (!AUTH_REQUIRED || !!token);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, ready }}>
      {authenticated ? children : null}
      {mounted && (
        <LoginDialog open={AUTH_REQUIRED && ready && !authenticated} onLogin={login} />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
