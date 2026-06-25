"use client";

import React, { useState } from "react";

interface LoginDialogProps {
  open: boolean;
  onLogin: (username: string, password: string) => Promise<void>;
}

export function LoginDialog({ open, onLogin }: LoginDialogProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop open">
      <div className="modal" style={{ maxWidth: 400, margin: "120px auto" }}>
        <div className="panel-head">
          <h2 className="panel-title">Supply Chain Agent</h2>
        </div>
        <form className="panel-body stack" onSubmit={handleSubmit}>
          <label className="filter-field">
            <span className="filter-label">Username</span>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">Password</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>
              {error}
            </p>
          )}
          <button
            className="btn primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
