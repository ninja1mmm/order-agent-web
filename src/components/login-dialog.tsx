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
      setError("请输入用户名和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop open">
      <div className="modal" style={{ maxWidth: 400, margin: "120px auto" }}>
        <div className="panel-head">
          <h2 className="panel-title">Supply Chain Agent 登录</h2>
        </div>
        <form className="panel-body stack" onSubmit={handleSubmit}>
          <label className="filter-field">
            <span className="filter-label">用户名</span>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin / planner / cathy"
              autoFocus
              autoComplete="username"
            />
          </label>
          <label className="filter-field">
            <span className="filter-label">密码</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="123456"
              autoComplete="current-password"
            />
          </label>
          {error && <p style={{ color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>}
          <button className="btn primary" type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "登录中..." : "登录"}
          </button>
          <p className="item-meta" style={{ textAlign: "center" }}>
            POC 测试账号：admin / planner / cathy，密码：123456
          </p>
        </form>
      </div>
    </div>
  );
}
