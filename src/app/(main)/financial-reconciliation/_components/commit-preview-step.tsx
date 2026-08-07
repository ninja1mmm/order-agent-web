"use client";

import { Badge } from "@/components/ui/badge";
import type { CommitPreviewRow, MatchSummary } from "@/services/reconciliation";
import { formatQty } from "./reconciliation-utils";

type CommitPreviewStepProps = {
  summary: MatchSummary | null;
  rows: CommitPreviewRow[];
};

export function CommitPreviewStep({ summary, rows }: CommitPreviewStepProps) {
  return (
    <div className="recon-step">
      <div className="recon-summary-strip">
        <span>已确认匹配 {summary?.confirmedCount ?? 0}</span>
        <span>发运变更 {Object.keys(summary?.pendingShipDeltas ?? {}).length}</span>
        <span>收货变更 {Object.keys(summary?.pendingRecvDeltas ?? {}).length}</span>
      </div>
      <div className="scroll-x recon-table-wrap recon-commit-table-wrap">
        <table className="table recon-table recon-commit-table">
          <thead>
            <tr>
              <th>记录类型</th>
              <th>单据号</th>
              <th>客户</th>
              <th>物料</th>
              <th className="num">发运数量</th>
              <th>当前对账状态</th>
              <th className="num">本次确认数量</th>
              <th>写回状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.side === "shipment" ? "发运记录" : "收货记录"}</td>
                <td>{row.recordNo}</td>
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
        {rows.length === 0 ? <div className="recon-state inline">暂无待写回变更。</div> : null}
      </div>
    </div>
  );
}
