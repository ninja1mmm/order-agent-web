"use client";

import { useState } from "react";
import { Pencil, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { MailboxSettings } from "@/services/settings";
import { formatDateTime } from "../../_components/shared";

type MailboxSectionProps = {
  mailbox: MailboxSettings | null;
  testing: boolean;
  onTestConnection: () => void;
  onUpdateSettings: (payload: { syncWindowDays?: number; syncIntervalSeconds?: number }) => void;
};

function EditableNumber({
  value,
  suffix,
  min,
  max,
  onCommit,
}: {
  value: number;
  suffix: string;
  min: number;
  max: number;
  onCommit: (v: number) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  const commit = () => {
    if (editing === null) return;
    const parsed = parseInt(editing, 10);
    if (!isNaN(parsed) && parsed >= min && parsed <= max && parsed !== value) {
      onCommit(parsed);
    }
    setEditing(null);
  };

  if (editing !== null) {
    return (
      <input
        type="number"
        min={min}
        max={max}
        value={editing}
        onChange={(e) => setEditing(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") setEditing(null);
        }}
        autoFocus
        className="inline-input"
        style={{ width: 70 }}
      />
    );
  }

  return (
    <Tooltip><TooltipTrigger asChild><span
      className="editable-value"
      onClick={() => setEditing(String(value))}
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === "Enter") setEditing(String(value)); }}
    >
      {value} {suffix}
      <Pencil className="h-3 w-3 editable-icon" />
    </span></TooltipTrigger><TooltipContent>点击编辑</TooltipContent></Tooltip>
  );
}

export function MailboxSection({ mailbox, testing, onTestConnection, onUpdateSettings }: MailboxSectionProps) {
  return (
    <>
      <div className="panel-head">
        <h2 className="panel-title">统一邮箱</h2>
        <div className="list-actions">
          <Button
            variant={testing ? "primary" : "default"}
            size="sm"
            disabled={testing}
            className={testing ? "btn-parsing" : ""}
            onClick={onTestConnection}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
            {testing ? "测试中..." : "测试连接"}
          </Button>
        </div>
      </div>
      <div className="panel-body stack">
        {mailbox ? (
          <div className="grid-2">
            <div className="filter-field">
              <span className="filter-label">邮箱地址</span>
              <span className="filter-value">{mailbox.address || "-"}</span>
            </div>
            <div className="filter-field">
              <span className="filter-label">服务类型</span>
              <span className="filter-value">{mailbox.providerType}</span>
            </div>
            <div className="filter-field">
              <span className="filter-label">IMAP 服务器</span>
              <span className="filter-value">{mailbox.host}:{mailbox.port}</span>
            </div>
            <div className="filter-field">
              <span className="filter-label">同步间隔</span>
              <span className="filter-value">
                <EditableNumber
                  value={mailbox.syncIntervalSeconds}
                  suffix="秒"
                  min={10}
                  max={86400}
                  onCommit={(v) => onUpdateSettings({ syncIntervalSeconds: v })}
                />
              </span>
            </div>
            <div className="filter-field">
              <span className="filter-label">扫描窗口</span>
              <span className="filter-value">
                <EditableNumber
                  value={mailbox.syncWindowDays}
                  suffix="天"
                  min={1}
                  max={365}
                  onCommit={(v) => onUpdateSettings({ syncWindowDays: v })}
                />
              </span>
            </div>
            <div className="filter-field">
              <span className="filter-label">状态</span>
              <span className="filter-value">
                <Badge variant={mailbox.enabled ? "green" : "slate"}>
                  {mailbox.enabled ? "已启用" : "已停用"}
                </Badge>
              </span>
            </div>
            <div className="filter-field">
              <span className="filter-label">连接状态</span>
              <span className="filter-value">
                <Badge variant={mailbox.connected ? "green" : "red"}>
                  {mailbox.connected ? "已连接" : "未连接"}
                </Badge>
              </span>
            </div>
            <div className="filter-field">
              <span className="filter-label">上次同步</span>
              <span className="filter-value">
                {mailbox.lastSyncAt ? formatDateTime(mailbox.lastSyncAt, "zh-CN") : "-"}
              </span>
            </div>
            <div className="filter-field">
              <span className="filter-label">最近轮询</span>
              <span className="filter-value">
                收到 {mailbox.lastReceived} / 入库 {mailbox.lastCreated} / 跳过 {mailbox.lastSkipped}
              </span>
            </div>
          </div>
        ) : (
          <p className="item-meta">加载中...</p>
        )}
      </div>
    </>
  );
}
