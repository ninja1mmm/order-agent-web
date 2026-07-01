"use client";

import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MailboxSettings } from "@/services/settings";
import { formatDateTime } from "../../_components/shared";

type MailboxSectionProps = {
  mailbox: MailboxSettings | null;
  testing: boolean;
  onTestConnection: () => void;
};

export function MailboxSection({ mailbox, testing, onTestConnection }: MailboxSectionProps) {
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
            <label className="filter-field">
              <span className="filter-label">邮箱地址</span>
              <span className="filter-value">{mailbox.address || "-"}</span>
            </label>
            <label className="filter-field">
              <span className="filter-label">服务类型</span>
              <span className="filter-value">{mailbox.providerType}</span>
            </label>
            <label className="filter-field">
              <span className="filter-label">IMAP 服务器</span>
              <span className="filter-value">{mailbox.host}:{mailbox.port}</span>
            </label>
            <label className="filter-field">
              <span className="filter-label">同步间隔</span>
              <span className="filter-value">{mailbox.syncIntervalSeconds} 秒</span>
            </label>
            <label className="filter-field">
              <span className="filter-label">状态</span>
              <span className="filter-value">
                <Badge variant={mailbox.enabled ? "green" : "slate"}>
                  {mailbox.enabled ? "已启用" : "已停用"}
                </Badge>
              </span>
            </label>
            <label className="filter-field">
              <span className="filter-label">连接状态</span>
              <span className="filter-value">
                <Badge variant={mailbox.connected ? "green" : "red"}>
                  {mailbox.connected ? "已连接" : "未连接"}
                </Badge>
              </span>
            </label>
            <label className="filter-field">
              <span className="filter-label">上次同步</span>
              <span className="filter-value">
                {mailbox.lastSyncAt ? formatDateTime(mailbox.lastSyncAt, "zh-CN") : "-"}
              </span>
            </label>
            <label className="filter-field">
              <span className="filter-label">最近轮询</span>
              <span className="filter-value">
                收到 {mailbox.lastReceived} / 入库 {mailbox.lastCreated} / 跳过 {mailbox.lastSkipped}
              </span>
            </label>
          </div>
        ) : (
          <p className="item-meta">加载中...</p>
        )}
      </div>
    </>
  );
}
