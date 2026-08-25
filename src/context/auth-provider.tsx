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
  logoutSession,
  redirectToLogin,
  setOnUnauthorized,
} from "../api/client";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(async () => {
    await logoutSession();
    setUser(null);
    redirectToLogin();
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      redirectToLogin();
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
          credentials: "include",
        });
        if (!res.ok) {
          if (!cancelled) {
            if (res.status === 401) {
              redirectToLogin();
            } else {
              setReady(true);
            }
          }
          return;
        }
        const profile = await res.json();
        if (!cancelled) {
          setUser({
            id: profile.id,
            username: profile.username,
            displayName: profile.displayName ?? null,
            roles: profile.roles ?? [],
            permissions: profile.permissions ?? [],
          });
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ user, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
