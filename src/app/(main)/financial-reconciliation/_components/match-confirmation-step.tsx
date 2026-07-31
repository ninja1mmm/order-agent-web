"use client";

import { CheckCircle2, LoaderCircle, RefreshCw, SlidersHorizontal, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  bulkConfirmReconciliationMatches,
  confirmReconciliationMatch,
  rejectReconciliationMatch,
  type MatchGroup,
  type ReconciliationMatch,
  type ReconciliationTask,
} from "@/services/reconciliation";
import { formatQty } from "./reconciliation-utils";

type MatchConfirmationStepProps = {
  task: ReconciliationTask | null;
  groups: MatchGroup[];
  loading: boolean;
  onAdjust: (match: ReconciliationMatch) => void;
  onChanged: () => void;
};

export function MatchConfirmationStep({ task, groups, loading, onAdjust, onChanged }: MatchConfirmationStepProps) {
  const candidates = groups.flatMap((group) => group.matches).filter((match) => match.status === "candidate");
  const noDiffCandidateIds = candidates.filter((match) => match.noDifference).map((match) => match.id);
  const taskId = task?.id ?? "";

  async function quickConfirm(match: ReconciliationMatch) {
    if (!taskId) return;
    try {
      await confirmReconciliationMatch(taskId, match.id);
      toast.success("匹配已确认");
      onChanged();
    } catch {
      toast.error("确认匹配失败");
    }
  }

  async function reject(match: ReconciliationMatch) {
    if (!taskId) return;
    try {
      await rejectReconciliationMatch(taskId, match.id);
      toast.success("匹配已拒绝");
      onChanged();
    } catch {
      toast.error("拒绝匹配失败");
    }
  }

  async function bulkConfirm() {
    if (!taskId || noDiffCandidateIds.length === 0) return;
    try {
      const result = await bulkConfirmReconciliationMatches(taskId, noDiffCandidateIds);
      toast.success(`已批量确认 ${result.confirmed} 条无差异候选`);
      onChanged();
    } catch {
      toast.error("批量确认失败");
    }
  }

  return (
    <div className="recon-step">
      <div className="row">
        <div>
          <p className="mini-title">匹配确认</p>
          <p className="item-meta">逐条确认候选匹配，或批量确认数量无差异的候选。</p>
        </div>
        <div className="list-actions">
          <Button variant="default" size="sm" onClick={onChanged}>
            <RefreshCw className="h-3.5 w-3.5" /> 刷新
          </Button>
          <Button variant="primary" size="sm" disabled={noDiffCandidateIds.length === 0} onClick={bulkConfirm}>
            <CheckCircle2 className="h-3.5 w-3.5" /> 批量确认无差异
          </Button>
        </div>
      </div>
      <div className="scroll-x recon-match-list">
        {loading ? <div className="recon-state inline"><LoaderCircle className="h-4 w-4 animate-spin" /> 加载匹配结果...</div> : null}
        {!loading && groups.length === 0 ? <div className="recon-state inline">暂无匹配结果，开始任务或重新生成后查看。</div> : null}
        {groups.map((group) => (
          <div className="recon-match-group" key={group.key}>
            <div className="recon-match-group-head">
              <strong>{group.shipment?.deliveryNo ?? group.key}</strong>
              <span>{group.shipment?.internalPartNumber ?? "-"} · 发运 {formatQty(group.shipment?.qty)}</span>
              <Badge variant="amber">{group.candidateCount} 待确认</Badge>
            </div>
            <table className="table recon-table">
              <thead>
                <tr>
                  <th>收货单/需求单</th>
                  <th>匹配数量</th>
                  <th>差异</th>
                  <th>方式</th>
                  <th>置信度</th>
                  <th>状态</th>
                  <th className="recon-actions-col">操作</th>
                </tr>
              </thead>
              <tbody>
                {group.matches.map((match) => (
                  <tr key={match.id}>
                    <td>{match.receipt?.demandOrderNo ?? match.receiptRecordId ?? "无收货记录"}</td>
                    <td className="num">{formatQty(match.matchedQty)}</td>
                    <td className="num">{match.differenceQty == null ? "-" : formatQty(match.differenceQty)}</td>
                    <td>{match.matchMethod}</td>
                    <td>{match.confidenceScore == null ? "-" : `${Math.round(match.confidenceScore * 100)}%`}</td>
                    <td><Badge variant={match.statusVariant}>{match.statusLabel}</Badge></td>
                    <td>
                      <div className="recon-row-actions">
                        <Button size="icon-sm" disabled={match.status !== "candidate"} title="调整确认" onClick={() => onAdjust(match)}>
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon-sm" disabled={match.status !== "candidate"} title="直接确认" onClick={() => { void quickConfirm(match); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="destructive" size="icon-sm" disabled={match.status !== "candidate"} title="拒绝" onClick={() => { void reject(match); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
