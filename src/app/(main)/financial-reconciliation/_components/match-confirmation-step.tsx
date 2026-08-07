"use client";

import { type CSSProperties, type DragEvent, useMemo, useState } from "react";
import { CheckCircle2, GripVertical, LoaderCircle, RotateCcw, Save, Unlink2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  confirmReconciliationMatch,
  createManualReconciliationMatch,
  rejectReconciliationMatch,
  remapReconciliationMatchReceipt,
  unconfirmReconciliationMatch,
  type MatchGroup,
  type ReceiptRecord,
  type ReconciliationMatch,
  type ReconciliationTask,
  type ShipmentRecord,
} from "@/services/reconciliation";
import type { MatchDetailRow } from "@/types/models/reconciliation";
import { formatDate, formatQty } from "./reconciliation-utils";

type MatchConfirmationStepProps = {
  task: ReconciliationTask | null;
  groups: MatchGroup[];
  loading: boolean;
  loadingState?: "starting" | "regenerating" | "loading" | null;
  onChanged: () => void;
};

type MatchFilter = "all" | "exception" | "consistent";

type DragReceiptPayload = {
  receiptRecordId: string;
  sourceRowKey: string;
};

type PendingMatchChange = {
  receiptRecordId: string | null;
  matchedQty: number | null;
};

const boardColumns = "minmax(136px, 0.5fr) minmax(136px, 0.5fr) minmax(430px, 1.7fr) 80px";
const mutedText: CSSProperties = { color: "var(--muted)", fontSize: 11, fontWeight: 850 };
const boardStyle: CSSProperties = {
  display: "grid",
  minWidth: 900,
  borderTop: "1px solid var(--line)",
};
const boardHeadStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: boardColumns,
  minHeight: 34,
  background: "var(--heat-0)",
  color: "var(--muted)",
  fontSize: 12,
  fontWeight: 900,
};
const boardHeadCellStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  borderRight: "1px solid rgba(203, 213, 225, 0.56)",
  padding: "0 12px",
};
const boardRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: boardColumns,
  alignItems: "stretch",
  minHeight: 54,
  borderTop: "1px solid var(--line)",
  background: "var(--surface-alt)",
};
const mapCellStyle: CSSProperties = {
  minWidth: 0,
  borderRight: "1px solid rgba(231, 235, 243, 0.92)",
  padding: "6px 9px",
};
const mapCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  alignContent: "stretch",
  gap: 2,
  height: "100%",
  minHeight: 42,
  minWidth: 0,
  background: "white",
};
const emptyCardStyle: CSSProperties = {
  ...mapCardStyle,
  color: "var(--muted-light)",
  fontSize: 12,
  fontWeight: 850,
};
const cardTopStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  minWidth: 0,
};
const cardTitleStyle: CSSProperties = {
  minWidth: 0,
  overflow: "hidden",
  color: "var(--ink)",
  fontSize: 13,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 950,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const quantityTitleStyle: CSSProperties = {
  ...cardTitleStyle,
  fontSize: 14,
};
const smallDateStyle: CSSProperties = {
  display: "block",
  minHeight: "auto",
  border: 0,
  background: "transparent",
  color: "var(--muted)",
  fontSize: 10,
  fontWeight: 850,
  padding: 0,
};
const cardMetaStyle: CSSProperties = {
  display: "flex",
  alignSelf: "end",
  flexWrap: "wrap",
  gap: 6,
  minWidth: 0,
};
const metaPillStyle: CSSProperties = {
  ...mutedText,
  display: "inline-flex",
  alignItems: "center",
  minHeight: 22,
  border: "1px solid var(--line)",
  borderRadius: 999,
  background: "var(--surface-soft)",
  padding: "0 8px",
  whiteSpace: "nowrap",
};
const receiptCardStyle: CSSProperties = {
  border: "1px solid var(--line)",
  borderRadius: 8,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};
const dropzoneStyle: CSSProperties = {
  ...mapCellStyle,
  display: "grid",
  alignItems: "stretch",
  minHeight: 54,
  background: "rgba(255, 255, 255, 0.72)",
};
const judgementStyle: CSSProperties = {
  ...mapCellStyle,
  display: "grid",
  alignContent: "center",
  gap: 5,
};
const judgementLineStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};
const judgementValueStyle: CSSProperties = {
  flex: "1 1 auto",
  minWidth: 0,
  overflow: "hidden",
  color: "var(--ink-soft)",
  fontSize: 12,
  fontVariantNumeric: "tabular-nums",
  fontWeight: 850,
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const mapActionsStyle: CSSProperties = {
  ...mapCellStyle,
  display: "flex",
  gap: 5,
  borderRight: 0,
  alignItems: "center",
  justifyContent: "center",
};
const judgementDetailsStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(240px, 1fr) minmax(96px, 0.36fr) minmax(174px, 0.44fr)",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};
const qtyInputStyle: CSSProperties = {
  width: 112,
  height: 28,
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "white",
  color: "var(--ink)",
  padding: "0 8px",
  textAlign: "right",
  fontSize: 12,
  fontWeight: 900,
  fontVariantNumeric: "tabular-nums",
};
const matchTagStyle: CSSProperties = {
  ...mutedText,
  display: "inline-flex",
  alignItems: "center",
  maxWidth: "100%",
  minHeight: 22,
  border: "1px solid var(--line)",
  borderRadius: 999,
  background: "var(--surface-soft)",
  padding: "0 8px",
};
const matchTagValueStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const dragTrayStyle: CSSProperties = {
  position: "fixed",
  right: 28,
  bottom: 28,
  zIndex: 70,
  display: "grid",
  gap: 4,
  width: "min(320px, calc(100vw - 32px))",
  border: "1px solid var(--forvia-blue-border)",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.96)",
  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.18)",
  padding: "12px 14px",
};
const unassignedDropTargetKey = "__unassigned_receipt__";

function loadingCopy(state: MatchConfirmationStepProps["loadingState"]) {
  if (state === "starting") {
    return {
      title: "正在开始正式对账",
      detail: "系统正在读取发运池和收货池，并生成候选匹配。完成后会自动刷新结果。",
    };
  }
  if (state === "regenerating") {
    return {
      title: "正在重新生成匹配候选",
      detail: "系统会清理并重算当前任务的候选匹配，已有确认结果会按后端规则保留或刷新。",
    };
  }
  return {
    title: "正在加载匹配结果",
    detail: "正在同步任务状态、候选匹配和汇总信息。",
  };
}

function groupIsMissing(group: MatchGroup) {
  return !group.hasShipment || !group.hasReceipt;
}

function groupIsConsistent(group: MatchGroup) {
  return group.hasShipment && group.hasReceipt && group.differenceQty === 0;
}

function groupIsException(group: MatchGroup) {
  return groupIsMissing(group) || group.differenceQty !== 0;
}

function defaultMatchedQty(shipment: ShipmentRecord, receipt: ReceiptRecord) {
  return Math.max(1, Math.min(Math.abs(shipment.qty), Math.abs(receipt.qty)));
}

export function MatchConfirmationStep({ task, groups, loading, loadingState, onChanged }: MatchConfirmationStepProps) {
  const [filter, setFilter] = useState<MatchFilter>("all");
  const [draggingReceipt, setDraggingReceipt] = useState<DragReceiptPayload | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, PendingMatchChange>>({});
  const [savingChanges, setSavingChanges] = useState(false);
  const filteredGroups = useMemo(() => {
    if (filter === "consistent") return groups.filter(groupIsConsistent);
    if (filter === "exception") return groups.filter(groupIsException);
    return groups;
  }, [filter, groups]);
  const allRows = useMemo(() => groups.flatMap((group) => group.rows), [groups]);
  const rowByKey = useMemo(
    () => new Map(allRows.map((row) => [row.key, row])),
    [allRows],
  );
  const receiptById = useMemo(() => {
    const entries = allRows.flatMap((row) => row.receipt ? [[row.receipt.id, row.receipt] as const] : []);
    return new Map(entries);
  }, [allRows]);
  const pendingCount = Object.keys(pendingChanges).length;
  const candidates = groups
    .flatMap((group) => group.matches)
    .filter((match) => match.status === "candidate" && match.shipment && match.receipt);
  const confirmedCount = groups.flatMap((group) => group.matches).filter((match) => match.status === "confirmed").length;
  const rejectedCount = groups.flatMap((group) => group.matches).filter((match) => match.status === "rejected").length;
  const exceptionCount = groups.filter(groupIsException).length;
  const consistentCount = groups.filter(groupIsConsistent).length;
  const taskId = task?.id ?? "";
  const copy = loadingCopy(loadingState);
  const emptyText = task?.status === "draft"
    ? "任务尚未开始，点击右上角开始任务后生成候选匹配。"
    : "暂无匹配结果，可刷新或重新生成候选。";
  const taskEditable = task?.status === "in_progress";

  function rowReceipt(row: MatchDetailRow) {
    const pending = pendingChanges[row.key];
    if (!pending) return row.receipt;
    return pending.receiptRecordId ? receiptById.get(pending.receiptRecordId) ?? null : null;
  }

  function rowMatchedQty(row: MatchDetailRow) {
    const pending = pendingChanges[row.key];
    if (!pending) return row.matchedQty;
    return pending.matchedQty;
  }

  function setPendingRow(row: MatchDetailRow, change: PendingMatchChange) {
    const originalReceiptId = row.receipt?.id ?? null;
    const originalQty = row.matchedQty ?? null;
    const unchanged = originalReceiptId === change.receiptRecordId && originalQty === change.matchedQty;
    setPendingChanges((current) => {
      const next = { ...current };
      if (unchanged) delete next[row.key];
      else next[row.key] = change;
      return next;
    });
  }

  function ensureNoPendingBeforeImmediateAction() {
    if (pendingCount === 0) return true;
    toast.error("请先保存或放弃当前映射调整");
    return false;
  }

  async function quickConfirm(match: ReconciliationMatch) {
    if (!taskId || savingChanges || !ensureNoPendingBeforeImmediateAction()) return;
    try {
      await confirmReconciliationMatch(taskId, match.id);
      toast.success("匹配已确认");
      onChanged();
    } catch {
      toast.error("确认匹配失败");
    }
  }

  async function reject(match: ReconciliationMatch) {
    if (!taskId || savingChanges || !ensureNoPendingBeforeImmediateAction()) return;
    try {
      await rejectReconciliationMatch(taskId, match.id);
      toast.success("匹配已拒绝");
      onChanged();
    } catch {
      toast.error("拒绝匹配失败");
    }
  }

  async function unconfirm(match: ReconciliationMatch) {
    if (!taskId || savingChanges || !ensureNoPendingBeforeImmediateAction()) return;
    try {
      await unconfirmReconciliationMatch(taskId, match.id);
      toast.success("已取消确认");
      onChanged();
    } catch {
      toast.error("取消确认失败");
    }
  }

  function handleReceiptDragStart(event: DragEvent<HTMLDivElement>, row: MatchDetailRow) {
    const receipt = rowReceipt(row);
    if (!taskEditable || savingChanges || !receipt) return;
    const payload: DragReceiptPayload = {
      receiptRecordId: receipt.id,
      sourceRowKey: row.key,
    };
    setDraggingReceipt(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
  }

  function parseDragPayload(event: DragEvent<HTMLDivElement>) {
    if (draggingReceipt) return draggingReceipt;
    const raw = event.dataTransfer.getData("application/json");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DragReceiptPayload;
    } catch {
      return null;
    }
  }

  function canDropReceipt(row: MatchDetailRow) {
    if (!taskEditable || savingChanges || !draggingReceipt || !row.shipment || row.key === draggingReceipt.sourceRowKey) {
      return false;
    }
    const receipt = receiptById.get(draggingReceipt.receiptRecordId);
    return Boolean(receipt && receipt.internalPartNumber === row.shipment.internalPartNumber);
  }

  function canDropReceiptToUnassigned() {
    if (!taskEditable || savingChanges || !draggingReceipt) return false;
    const sourceRow = rowByKey.get(draggingReceipt.sourceRowKey);
    return Boolean(sourceRow?.shipment);
  }

  function detachReceiptFromRow(row: MatchDetailRow) {
    const receipt = rowReceipt(row);
    if (!taskEditable || savingChanges || !row.shipment || !receipt) return;
    setPendingRow(row, {
      receiptRecordId: null,
      matchedQty: null,
    });
  }

  function detachDraggedReceipt(payload: DragReceiptPayload) {
    const sourceRow = rowByKey.get(payload.sourceRowKey);
    if (!sourceRow?.shipment) return;
    detachReceiptFromRow(sourceRow);
    setDraggingReceipt(null);
    setDropTargetKey(null);
  }

  function moveReceiptToRow(payload: DragReceiptPayload, targetRow: MatchDetailRow) {
    if (!targetRow.shipment) return;
    if (payload.sourceRowKey === targetRow.key) return;
    const draggedReceipt = receiptById.get(payload.receiptRecordId);
    if (!draggedReceipt) {
      toast.error("未找到要移动的收货记录");
      return;
    }
    if (draggedReceipt.internalPartNumber !== targetRow.shipment.internalPartNumber) {
      toast.error("只能在相同物料下调整收货对应关系");
      return;
    }

    const sourceRow = rowByKey.get(payload.sourceRowKey);
    const displacedReceipt = rowReceipt(targetRow);
    setPendingRow(targetRow, {
      receiptRecordId: draggedReceipt.id,
      matchedQty: defaultMatchedQty(targetRow.shipment, draggedReceipt),
    });
    if (sourceRow) {
      setPendingRow(sourceRow, {
        receiptRecordId: displacedReceipt?.id ?? null,
        matchedQty: displacedReceipt && sourceRow.shipment ? defaultMatchedQty(sourceRow.shipment, displacedReceipt) : null,
      });
    }
    setDraggingReceipt(null);
    setDropTargetKey(null);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, row: MatchDetailRow) {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload) return;
    moveReceiptToRow(payload, row);
  }

  async function savePendingChanges() {
    if (!taskId || pendingCount === 0) return;
    setSavingChanges(true);
    try {
      const entries = Object.entries(pendingChanges);
      const invalid = entries.some(([rowKey, change]) => {
        const row = rowByKey.get(rowKey);
        return Boolean(row?.shipment && change.receiptRecordId && (!change.matchedQty || change.matchedQty <= 0));
      });
      if (invalid) {
        toast.error("确认数量必须大于 0");
        return;
      }
      for (const [rowKey, change] of entries) {
        const row = rowByKey.get(rowKey);
        if (!row?.match) continue;
        const originalReceiptId = row.receipt?.id ?? null;
        if (originalReceiptId !== change.receiptRecordId) {
          await remapReconciliationMatchReceipt(taskId, row.match.id, { receiptRecordId: null });
        }
      }
      for (const [rowKey, change] of entries) {
        const row = rowByKey.get(rowKey);
        if (!row) continue;
        const originalReceiptId = row.receipt?.id ?? null;
        if (row.match) {
          if (originalReceiptId !== change.receiptRecordId) {
            if (change.receiptRecordId) {
              await remapReconciliationMatchReceipt(taskId, row.match.id, {
                receiptRecordId: change.receiptRecordId,
                matchedQty: change.matchedQty,
                remark: "手工调整收货对应关系",
              });
            }
          } else if (row.matchedQty !== change.matchedQty) {
            await confirmReconciliationMatch(taskId, row.match.id, {
              matchedQty: change.matchedQty,
              remark: "手工调整确认数量",
            });
          }
        } else if (row.shipment && change.receiptRecordId && change.matchedQty) {
          await createManualReconciliationMatch(taskId, {
            shipmentRecordId: row.shipment.id,
            receiptRecordId: change.receiptRecordId,
            matchedQty: change.matchedQty,
            remark: "手工创建收货对应关系",
          });
        }
      }
      toast.success(`已保存 ${pendingCount} 条调整`);
      setPendingChanges({});
      onChanged();
    } catch (error) {
      console.error("Failed to save match changes", error);
      toast.error(error instanceof Error ? `保存调整失败：${error.message}` : "保存调整失败");
    } finally {
      setSavingChanges(false);
    }
  }

  function updateMatchedQty(row: MatchDetailRow, value: number) {
    const receipt = rowReceipt(row);
    setPendingRow(row, {
      receiptRecordId: receipt?.id ?? null,
      matchedQty: Number.isFinite(value) && value > 0 ? value : null,
    });
  }

  function renderShipmentCard(row: MatchDetailRow) {
    if (!row.shipment) {
      return (
        <div className="recon-map-card empty" style={emptyCardStyle}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 42,
            border: "1px dashed var(--line-strong)",
            borderRadius: 8,
            background: "var(--surface-soft)",
          }}>无发运记录</span>
        </div>
      );
    }
    return (
      <div className="recon-map-card shipment-card" style={{ ...mapCardStyle, padding: "5px 8px" }} aria-label="发运记录">
        <div className="recon-map-card-top" style={cardTopStyle}>
          <strong style={quantityTitleStyle}>{formatQty(Math.abs(row.shipment.qty))}</strong>
          <span style={metaPillStyle}>交货 {row.shipment.deliveryNo ?? "-"}</span>
        </div>
        <div className="recon-map-card-meta" style={cardMetaStyle}>
          <span className="recon-map-card-date" style={smallDateStyle}>{formatDate(row.shipment.shipmentDate)}</span>
        </div>
      </div>
    );
  }

  function renderReceiptCard(row: MatchDetailRow) {
    const receipt = rowReceipt(row);
    if (!receipt) {
      return (
        <div className="recon-map-card empty receipt-empty" style={emptyCardStyle}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 42,
            border: "1px dashed var(--line-strong)",
            borderRadius: 8,
            background: "var(--surface-soft)",
          }}>{row.shipment ? "拖入收货记录" : "无收货记录"}</span>
        </div>
      );
    }
    const canDrag = taskEditable && !savingChanges;
    return (
      <div
        className={`recon-map-card receipt-card${canDrag ? " draggable" : ""}${draggingReceipt?.receiptRecordId === receipt.id ? " dragging" : ""}`}
        style={{
          ...mapCardStyle,
          ...receiptCardStyle,
          padding: "5px 8px",
          cursor: canDrag ? "grab" : "default",
          opacity: draggingReceipt?.receiptRecordId === receipt.id ? 0.46 : 1,
        }}
        draggable={canDrag}
        onDragStart={(event) => handleReceiptDragStart(event, row)}
        onDragEnd={() => {
          setDraggingReceipt(null);
          setDropTargetKey(null);
        }}
        aria-label="收货记录"
      >
        <div className="recon-map-card-top" style={cardTopStyle}>
          <strong style={quantityTitleStyle}>{formatQty(Math.abs(receipt.qty))}</strong>
          {canDrag ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {row.shipment ? (
                <button
                  aria-label="移出收货对应"
                  disabled={savingChanges}
                  onClick={(event) => {
                    event.stopPropagation();
                    detachReceiptFromRow(row);
                  }}
                  title="移出收货对应"
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    background: "var(--surface-soft)",
                    color: "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  <Unlink2 className="h-3 w-3" />
                </button>
              ) : null}
              <GripVertical className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
        <div className="recon-map-card-meta" style={cardMetaStyle}>
          <span className="recon-map-card-date" style={smallDateStyle}>{formatDate(receipt.receiptDate)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="recon-step">
      <div className="recon-match-metrics" aria-label="当前匹配候选统计">
        <span>物料 <strong>{groups.length}</strong></span>
        <span>待确认匹配 <strong>{candidates.length}</strong></span>
        <span>已确认匹配 <strong>{confirmedCount}</strong></span>
        <span>已拒绝匹配 <strong>{rejectedCount}</strong></span>
        <span>一致物料 <strong>{consistentCount}</strong></span>
        {pendingCount > 0 ? (
          <>
            <span className="recon-pending-change-pill">未保存调整 <strong>{pendingCount}</strong></span>
            <Button variant="primary" size="sm" disabled={savingChanges} onClick={() => void savePendingChanges()}>
              {savingChanges ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              保存调整
            </Button>
            <Button variant="default" size="sm" disabled={savingChanges} onClick={() => setPendingChanges({})}>
              放弃调整
            </Button>
          </>
        ) : null}
      </div>
      <div className="recon-match-workspace">
        <aside className="recon-match-rail" aria-label="对账类目">
          <button className={filter === "all" ? "active" : ""} type="button" onClick={() => setFilter("all")}>
            <span>全部</span>
            <strong>{groups.length}</strong>
          </button>
          <button className={filter === "exception" ? "active warning" : "warning"} type="button" onClick={() => setFilter("exception")}>
            <span>异常</span>
            <strong>{exceptionCount}</strong>
          </button>
          <button className={filter === "consistent" ? "active success" : "success"} type="button" onClick={() => setFilter("consistent")}>
            <span>一致</span>
            <strong>{consistentCount}</strong>
          </button>
        </aside>
        <div className="recon-match-list">
        {loading ? (
          <div className="recon-match-progress" role="status" aria-live="polite">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <div>
              <strong>{copy.title}</strong>
              <span>{copy.detail}</span>
            </div>
          </div>
        ) : null}
        {!loading && groups.length === 0 ? <div className="recon-state inline">{emptyText}</div> : null}
        {!loading && groups.length > 0 && filteredGroups.length === 0 ? <div className="recon-state inline">当前类目暂无物料。</div> : null}
        {filteredGroups.map((group, index) => (
          <details className="recon-match-group" key={`${filter}:${group.key}`} open={index === 0 ? true : undefined}>
            <summary className="recon-match-group-head">
              <div className="recon-material-main">
                <strong>{group.materialNo}</strong>
                {group.materialName ? <span>{group.materialName}</span> : null}
              </div>
              <div className="recon-material-totals">
                <span>发运 <strong>{formatQty(group.shipmentQty)}</strong></span>
                <span>收货 <strong>{formatQty(group.receiptQty)}</strong></span>
                {group.differenceQty === 0 ? (
                  <span className="ok">一致</span>
                ) : (
                  <span className="diff">差异 {formatQty(Math.abs(group.differenceQty))}</span>
                )}
                {!group.hasReceipt ? <Badge variant="red">缺收货</Badge> : null}
                {!group.hasShipment ? <Badge variant="red">缺发运</Badge> : null}
                {group.candidateCount > 0 ? <Badge variant="amber">{group.candidateCount} 待处理</Badge> : null}
                {group.confirmedCount > 0 ? <Badge variant="green">{group.confirmedCount} 已确认</Badge> : null}
                {group.rejectedCount > 0 ? <Badge variant="red">{group.rejectedCount} 已拒绝</Badge> : null}
              </div>
            </summary>
            {group.rows.length === 0 ? (
              <div className="recon-match-empty-detail">当前物料没有可自动生成的候选明细，请核对发运和收货记录后手工处理。</div>
            ) : (
              <div className="recon-match-board" style={boardStyle}>
                <div className="recon-match-board-head" style={boardHeadStyle}>
                  <span style={boardHeadCellStyle}>发运记录</span>
                  <span style={boardHeadCellStyle}>收货记录</span>
                  <span style={boardHeadCellStyle}>匹配判断</span>
                  <span style={{ ...boardHeadCellStyle, borderRight: 0 }}>操作</span>
                </div>
                {group.rows.map((row) => {
                  const matchStatus = row.match?.status;
                  const isConfirmed = matchStatus === "confirmed";
                  const dropActive = dropTargetKey === row.key && canDropReceipt(row);
                  const receipt = rowReceipt(row);
                  const matchedQty = rowMatchedQty(row);
                  const canToggleConfirm = taskEditable && Boolean(row.match && row.shipment && receipt) && !savingChanges;
                  const canReject = taskEditable && Boolean(row.match) && matchStatus !== "rejected" && !savingChanges;
                  const showDemandOrderMatch = Boolean(row.shipment?.demandOrderNo && receipt?.demandOrderNo);
                  const hasPending = Boolean(pendingChanges[row.key]);
                  return (
                    <div
                      className={`recon-match-board-row${dropActive ? " drop-active" : ""}`}
                      style={{
                        ...boardRowStyle,
                        background: dropActive ? "var(--forvia-blue-soft)" : "var(--surface-alt)",
                        boxShadow: dropActive ? "inset 0 0 0 2px var(--forvia-blue-border)" : undefined,
                      }}
                      key={row.key}
                    >
                      <div style={mapCellStyle}>{renderShipmentCard(row)}</div>
                      <div
                        className={`recon-receipt-dropzone${row.shipment ? "" : " disabled"}${dropActive ? " active" : ""}`}
                        style={{
                          ...dropzoneStyle,
                          background: row.shipment
                            ? dropActive ? "rgba(91, 108, 255, 0.08)" : "rgba(255, 255, 255, 0.72)"
                            : "var(--surface-muted)",
                        }}
                        onDragOver={(event) => {
                          if (!canDropReceipt(row)) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDropTargetKey(row.key);
                        }}
                        onDragLeave={() => {
                          if (dropTargetKey === row.key) setDropTargetKey(null);
                        }}
                        onDrop={(event) => handleDrop(event, row)}
                      >
                        {renderReceiptCard(row)}
                      </div>
                      <div className="recon-map-judgement" style={judgementStyle}>
                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, minWidth: 0 }}>
                          <Badge variant={row.resultVariant}>{row.resultLabel}</Badge>
                          {row.statusLabel && row.statusVariant ? <Badge variant={row.statusVariant}>{row.statusLabel}</Badge> : null}
                          {hasPending ? <Badge variant="blue">待保存</Badge> : null}
                          {showDemandOrderMatch ? (
                            <span
                              style={{
                                ...matchTagStyle,
                                borderColor: row.shipment?.demandOrderNo === receipt?.demandOrderNo
                                  ? "var(--success-border)"
                                  : "var(--danger-border)",
                                background: row.shipment?.demandOrderNo === receipt?.demandOrderNo
                                  ? "var(--success-soft)"
                                  : "var(--danger-soft)",
                              }}
                            >
                              <span style={matchTagValueStyle}>发运 {row.shipment?.demandOrderNo}</span>
                              <span style={{ padding: "0 4px" }}>/</span>
                              <span style={matchTagValueStyle}>收货 {receipt?.demandOrderNo}</span>
                            </span>
                          ) : null}
                        </div>
                        <div style={judgementDetailsStyle}>
                          <div style={judgementLineStyle}>
                            <span style={{ ...mutedText, flex: "0 0 auto" }}>对账方式</span>
                            <strong style={judgementValueStyle} title={row.matchMethod}>{row.matchMethodLabel}</strong>
                          </div>
                          <div style={judgementLineStyle}>
                            <span style={{ ...mutedText, flex: "0 0 auto" }}>置信</span>
                            <strong style={judgementValueStyle}>{row.confidenceScore == null ? "-" : `${Math.round(row.confidenceScore * 100)}%`}</strong>
                          </div>
                          <div style={{ ...judgementLineStyle, justifyContent: "flex-end" }}>
                            <span style={{ ...mutedText, flex: "0 0 auto" }}>确认数量</span>
                            <input
                              aria-label="确认数量"
                              disabled={!taskEditable || savingChanges || !row.shipment || !receipt}
                              min={1}
                              type="number"
                              value={matchedQty ?? ""}
                              onChange={(event) => updateMatchedQty(row, Number(event.target.value))}
                              style={qtyInputStyle}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="recon-row-actions recon-map-actions" style={mapActionsStyle}>
                        <Button
                          size="icon-sm"
                          disabled={!canToggleConfirm}
                          title={isConfirmed ? "取消确认" : "直接确认"}
                          onClick={() => {
                            if (!row.match) return;
                            if (isConfirmed) void unconfirm(row.match);
                            else void quickConfirm(row.match);
                          }}
                        >
                          {isConfirmed ? <RotateCcw className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="destructive" size="icon-sm" disabled={!canReject} title="拒绝匹配" onClick={() => { if (row.match) void reject(row.match); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </details>
        ))}
        </div>
      </div>
      {draggingReceipt ? (
        <div
          className="recon-drag-tray"
          style={{
            ...dragTrayStyle,
            borderColor: dropTargetKey === unassignedDropTargetKey ? "var(--warning-border)" : dragTrayStyle.borderColor,
            background: dropTargetKey === unassignedDropTargetKey ? "var(--warning-soft)" : dragTrayStyle.background,
          }}
          role="status"
          aria-live="polite"
          onDragOver={(event) => {
            if (!canDropReceiptToUnassigned()) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTargetKey(unassignedDropTargetKey);
          }}
          onDragLeave={() => {
            if (dropTargetKey === unassignedDropTargetKey) setDropTargetKey(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            const payload = parseDragPayload(event);
            if (!payload || !canDropReceiptToUnassigned()) return;
            detachDraggedReceipt(payload);
          }}
        >
          <strong style={{ color: "var(--forvia-blue)", fontSize: 12, fontWeight: 950 }}>收货暂存</strong>
          <span style={{
            overflow: "hidden",
            color: "var(--ink)",
            fontSize: 14,
            fontVariantNumeric: "tabular-nums",
            fontWeight: 950,
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>{receiptById.get(draggingReceipt.receiptRecordId)?.demandOrderNo ?? draggingReceipt.receiptRecordId}</span>
          <small style={{ color: "var(--muted)", fontSize: 11, fontWeight: 800 }}>拖到目标发运右侧，或拖回这里移出当前对应</small>
        </div>
      ) : null}
    </div>
  );
}
