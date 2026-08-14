"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { CommitPreviewRow, MatchSummary } from "@/services/reconciliation";
import { formatDate, formatQty } from "./reconciliation-utils";

type CommitPreviewStepProps = {
  summary: MatchSummary | null;
  rows: CommitPreviewRow[];
};

export function CommitPreviewStep({ summary, rows }: CommitPreviewStepProps) {
  const [activeSide, setActiveSide] = useState<CommitPreviewRow["side"]>("shipment");
  const visibleRows = useMemo(() => (
    rows
      .filter((row) => row.side === activeSide)
      .sort((a, b) => {
        if (!a.recordDate) return b.recordDate ? 1 : a.recordNo.localeCompare(b.recordNo, "zh-CN");
        if (!b.recordDate) return -1;
        return a.recordDate.localeCompare(b.recordDate) || a.recordNo.localeCompare(b.recordNo, "zh-CN");
      })
  ), [activeSide, rows]);

  return (
    <div className="recon-step">
      <div className="recon-summary-strip">
        <span>已确认匹配 {summary?.confirmedCount ?? 0}</span>
        <div className="recon-preview-tabs" role="tablist" aria-label="写回记录类型">
          <button
            type="button"
            role="tab"
            aria-selected={activeSide === "shipment"}
            className={activeSide === "shipment" ? "active" : undefined}
            onClick={() => setActiveSide("shipment")}
          >
            发运变更 {Object.keys(summary?.pendingShipDeltas ?? {}).length}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeSide === "receipt"}
            className={activeSide === "receipt" ? "active" : undefined}
            onClick={() => setActiveSide("receipt")}
          >
            收货变更 {Object.keys(summary?.pendingRecvDeltas ?? {}).length}
          </button>
        </div>
      </div>
      <div
        className="scroll-x recon-table-wrap recon-commit-table-wrap"
        role="tabpanel"
        aria-label={activeSide === "shipment" ? "发运变更" : "收货变更"}
      >
        <table className="table recon-table recon-commit-table">
          <thead>
            <tr>
              <th>记录类型</th>
              <th>单据号</th>
              <th>日期</th>
              <th>客户</th>
              <th>物料</th>
              <th className="num">发运数量</th>
              <th>当前对账状态</th>
              <th className="num">本次确认数量</th>
              <th>写回状态</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.id}>
                <td>{row.side === "shipment" ? "发运记录" : "收货记录"}</td>
                <td>{row.recordNo}</td>
                <td>{formatDate(row.recordDate)}</td>
                <td>{row.customerName}</td>
                <td>{row.material}</td>
                <td className="num">{row.shipmentQty == null ? "-" : formatQty(row.shipmentQty)}</td>
                <td>{row.beforeStatus}</td>
                <td className="num">{row.pendingDelta == null ? "-" : formatQty(row.pendingDelta)}</td>
                <td><Badge variant={row.afterVariant}>{row.afterLabel}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleRows.length === 0 ? (
          <div className="recon-state inline">
            暂无待写回{activeSide === "shipment" ? "发运" : "收货"}变更。
          </div>
        ) : null}
      </div>
    </div>
  );
}
