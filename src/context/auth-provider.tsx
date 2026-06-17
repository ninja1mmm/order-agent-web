"use client";

import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import { LoginDialog } from "../components/login-dialog";

interface User {
  username: string;
  displayName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (stored && storedUser) {
      setToken(stored);
      setUser(JSON.parse(storedUser));
    } else {
      setShowLogin(true);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const mockUsers: Record<string, User> = {
      admin: { username: "admin", displayName: "Admin Sun", role: "admin" },
      planner: { username: "planner", displayName: "Planner Li", role: "planner" },
      cathy: { username: "cathy", displayName: "Cathy Zhang", role: "customerService" },
    };

    const matched = mockUsers[username];
    if (!matched || password !== "123456") {
      throw new Error("用户名或密码错误");
    }

    const fakeToken = btoa(`${username}:${Date.now()}`);
    localStorage.setItem("accessToken", fakeToken);
    localStorage.setItem("user", JSON.stringify(matched));
    setToken(fakeToken);
    setUser(matched);
    setShowLogin(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setShowLogin(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
      <LoginDialog open={showLogin && !token} onLogin={login} />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
