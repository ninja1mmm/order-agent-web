"use client";

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import {
  logoutSession,
  redirectToLogin,
  setOnUnauthorized,
} from "../api/client";
import { getAuthenticatedUser, type AuthenticatedUser } from "@/services/auth";

interface AuthContextType {
  user: AuthenticatedUser | null;
  logout: () => Promise<void>;
  ready: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
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
        const profile = await getAuthenticatedUser();
        if (!cancelled) {
          setUser(profile);
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
