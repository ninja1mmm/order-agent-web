"use client";

import { LockKeyhole } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CommitPreviewRow, MatchSummary } from "@/services/reconciliation";
import { formatQty } from "./reconciliation-utils";

type CommitPreviewStepProps = {
  summary: MatchSummary | null;
  rows: CommitPreviewRow[];
  closing: boolean;
  disabled: boolean;
  onCloseTask: () => void;
};

export function CommitPreviewStep({ summary, rows, closing, disabled, onCloseTask }: CommitPreviewStepProps) {
  return (
    <div className="recon-step">
      <div className="row">
        <div>
          <p className="mini-title">提交预览</p>
          <p className="item-meta">关闭任务前复核即将写回发运池和收货池的状态变化。</p>
        </div>
        <Button variant="primary" disabled={disabled || closing} onClick={onCloseTask}>
          <LockKeyhole className="h-3.5 w-3.5" /> {closing ? "关闭中..." : "关闭任务并写回"}
        </Button>
      </div>
      <div className="recon-summary-strip">
        <span>已确认匹配 {summary?.confirmedCount ?? 0}</span>
        <span>发运变更 {Object.keys(summary?.pendingShipDeltas ?? {}).length}</span>
        <span>收货变更 {Object.keys(summary?.pendingRecvDeltas ?? {}).length}</span>
      </div>
      <div className="scroll-x">
        <table className="table recon-table">
          <thead>
            <tr>
              <th>侧</th>
              <th>记录</th>
              <th>客户</th>
              <th>物料</th>
              <th>当前状态</th>
              <th>待写回差异</th>
              <th>写回后</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.side === "shipment" ? "发运" : "收货"}</td>
                <td>{row.recordNo}</td>
                <td>{row.customerName}</td>
                <td>{row.material}</td>
                <td>{row.beforeStatus}</td>
                <td className="num">{formatQty(row.pendingDelta)}</td>
                <td><Badge variant={row.afterLabel === "完全匹配" ? "green" : "amber"}>{row.afterLabel}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <div className="recon-state inline">暂无待写回变更。</div> : null}
      </div>
    </div>
  );
}
