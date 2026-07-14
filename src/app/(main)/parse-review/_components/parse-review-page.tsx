"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  copy,
  backendDateMs,
  customerLabel,
  taskStatusLabel,
  translatePipelineSummary,
  useLocale,
  useCustomerConfig,
  useWorkspacePolling,
} from "../../_components/shared";
import { proceedTask, patchRow, type TaskStaleState } from "@/services/tasks";
import { TaskListPanel } from "./left/task-list-panel";
import { MiddlePanel } from "./middle/middle-panel";
import { AgentFlowPanel } from "./right/agent-flow-panel";
import type { LocalNewRow, NewRowData, OrderType, TimelineEntry } from "./parse-review-types";

const DEFAULT_STATUS_FILTER = "__all__";
const ACTIVE_ONLY_FILTER = "__active__";
const ACTIVE_STATUSES = new Set(["queued", "pending", "running", "processing", "waiting_human_decision"]);

function taskTime(value: string | null | undefined): number {
  return backendDateMs(value);
}

function statusFilterFromParam(status: string | null) {
  if (!status) return DEFAULT_STATUS_FILTER;
  if (status === "processing") return "running";
  if (status === "published") return "completed";
  return status;
}

function resultTabForTask(taskType: string | undefined): "forecast" | "shipping" {
  return taskType === "extract_forecast" ? "forecast" : "shipping";
}

function detectDateFormat(input: string): { dateInfo: string; dateFormat: "day" | "week" | "month" } | null {
  const s = input.trim();
  if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(s)) {
    return { dateInfo: s.replace(/\//g, "-"), dateFormat: "day" };
  }
  if (/^\d{4}[-\s]?[CKW]?W\d{1,2}$/i.test(s) || /^[CKW]?W\s*\d{1,2}(\/\d{4})?$/i.test(s)) {
    return { dateInfo: s, dateFormat: "week" };
  }
  if (/^\d{4}[-/]\d{2}$/.test(s)) {
    return { dateInfo: s.replace(/\//g, "-"), dateFormat: "month" };
  }
  return null;
}

const PIPELINE_STEPS = ["extraction", "date_expansion", "conflict_resolution", "material_mapping", "published"] as const;
const STEP_LABELS: Record<string, string> = {
  extraction: "AI 提取",
  date_expansion: "日期扩展",
  conflict_resolution: "冲突检测",
  material_mapping: "料号匹配",
  published: "已发布",
};

export function ParseReviewPage() {
  const locale = useLocale();
  const params = useSearchParams();
  const { tasks, mails, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const t = copy[locale];
  const targetTaskId = params.get("taskId");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => statusFilterFromParam(params.get("status")));
  const [timeFilter, setTimeFilter] = useState("最近 30 天");
  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [referenceTime] = useState(() => Date.now());
  const [orderTypeMap, setOrderTypeMap] = useState<Map<string, OrderType>>(new Map());
  const [isProceedLoading, setIsProceedLoading] = useState(false);
  const [mappingSortOrder, setMappingSortOrder] = useState<"asc" | "desc" | null>(null);
  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(new Set());
  const [taskStaleState, setTaskStaleState] = useState<TaskStaleState | null>(null);
  const [localResultRevision, setLocalResultRevision] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [localRowOverrides, setLocalRowOverrides] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<NewRowData>({ customerPartNumber: "", quantity: "", dateInfo: "" });
  const [newRowErrors, setNewRowErrors] = useState<Record<string, string>>({});
  const [localNewRows, setLocalNewRows] = useState<LocalNewRow[]>([]);
  const effectiveTaskId = hasUserSelected ? selectedTaskId : (targetTaskId ?? selectedTaskId);
  const prevRevisionRef = useRef<string | null>(null);
  const localRevRef = useRef<number | null>(null);

  const taskCustomers = useMemo(
    () => [
      { value: "__all__", label: t.all },
      ...customers.map((customer) => ({ value: customer.id, label: customerLabel(customer) })),
    ],
    [customers, t.all],
  );
  const statusOptions = useMemo(
    () => [
      { value: DEFAULT_STATUS_FILTER, label: t.all },
      { value: ACTIVE_ONLY_FILTER, label: "进行中" },
      { value: "queued", label: taskStatusLabel("queued", locale) },
      { value: "waiting_human_decision", label: taskStatusLabel("waiting_human_decision", locale) },
      { value: "completed", label: taskStatusLabel("completed", locale) },
      { value: "failed", label: taskStatusLabel("failed", locale) },
      { value: "cancelled", label: taskStatusLabel("cancelled", locale) },
    ],
    [locale, t.all],
  );

  const filteredTasks = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const timeLimit =
      timeFilter === "今天"
        ? dayMs
        : timeFilter === "最近 7 天"
          ? 7 * dayMs
          : timeFilter === "最近 60 天"
            ? 60 * dayMs
            : 30 * dayMs;
    return tasks
      .filter((task) => {
        if (task.status === "skipped") return false;
        if (customerFilter !== "__all__" && task.customerId !== customerFilter) return false;
        if (statusFilter === DEFAULT_STATUS_FILTER) {
          // show all (no status filter)
        } else if (statusFilter === ACTIVE_ONLY_FILTER) {
          if (!ACTIVE_STATUSES.has(task.status)) return false;
        } else if (statusFilter === "running") {
          if (task.status !== "running" && task.status !== "processing") return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
        if (task.receivedAt && referenceTime - backendDateMs(task.receivedAt) > timeLimit) return false;
        return true;
      })
      .sort((a, b) => {
        const taskTimeDelta = taskTime(b.requestedAt) - taskTime(a.requestedAt);
        if (taskTimeDelta !== 0) return taskTimeDelta;
        return taskTime(b.receivedAt) - taskTime(a.receivedAt);
      });
  }, [customerFilter, referenceTime, statusFilter, tasks, timeFilter]);

  const imageAttachmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mail of mails) {
      for (const att of mail.attachments) {
        if (att.contentType?.startsWith("image/")) ids.add(att.attachmentId);
      }
    }
    return ids;
  }, [mails]);

  const instanceItems = useMemo(() => {
    const grouped = new Map<string, typeof filteredTasks>();
    for (const task of filteredTasks) {
      if (task.attachmentId && imageAttachmentIds.has(task.attachmentId)) continue;
      const key = `${task.mailMessageId}::${task.attachmentId ?? "__body__"}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(task);
    }
    return Array.from(grouped.values()).map((group) => group[0]);
  }, [filteredTasks, imageAttachmentIds]);

  const selectedTask = (() => {
    const fromEffective = filteredTasks.find((task) => task.id === effectiveTaskId);
    if (fromEffective) return fromEffective;
    if (!hasUserSelected && targetTaskId) {
      const fromAll = tasks.find((task) => task.id === targetTaskId);
      if (fromAll) return fromAll;
    }
    return instanceItems[0];
  })();
  const selectedMail = mails.find((mail) => mail.id === selectedTask?.mailMessageId);
  const isBodyTextTask = selectedTask?.attachmentId === null;
  const selectedAttachment = isBodyTextTask ? undefined : selectedMail?.attachments.find((a) => a.attachmentId === selectedTask?.attachmentId);
  const rowEntries = useMemo(() => Object.entries(selectedTask?.resultRows ?? {}), [selectedTask?.resultRows]);
  const visibleRowEntries = useMemo(
    () => rowEntries.filter(([k]) => !deletedRowIds.has(k)),
    [rowEntries, deletedRowIds],
  );
  const displayRowEntries = useMemo(() => {
    if (!mappingSortOrder) return visibleRowEntries;
    return [...visibleRowEntries].sort(([, a], [, b]) => {
      const aUnmapped = String(a.mappingStatus ?? "") === "unmapped" ? 0 : 1;
      const bUnmapped = String(b.mappingStatus ?? "") === "unmapped" ? 0 : 1;
      return mappingSortOrder === "asc" ? aUnmapped - bUnmapped : bUnmapped - aUnmapped;
    });
  }, [visibleRowEntries, mappingSortOrder]);
  const rows = useMemo(() => displayRowEntries.map(([, v]) => v), [displayRowEntries]);
  const rowIds = useMemo(() => displayRowEntries.map(([k]) => k), [displayRowEntries]);

  const conflictColorMap = useMemo(() => {
    const GRANULARITY_COLORS = ["conflict-group-orange", "conflict-group-purple", "conflict-group-teal", "conflict-group-pink"];
    const QUANTITY_COLORS = ["conflict-group-red", "conflict-group-crimson", "conflict-group-rose", "conflict-group-brick"];
    const partGroups: Record<string, string[]> = {};
    for (const [, row] of displayRowEntries) {
      const flag = String(row.conflictFlag ?? "none");
      if (flag !== "granularity_mismatch" && flag !== "quantity_conflict") continue;
      const pn = String(row.customerPartNumber ?? "");
      const key = `${flag}::${pn}`;
      if (!partGroups[key]) partGroups[key] = [];
    }
    const map = new Map<string, string>();
    let granIdx = 0, qtyIdx = 0;
    for (const key of Object.keys(partGroups)) {
      const [flag] = key.split("::");
      const palette = flag === "granularity_mismatch" ? GRANULARITY_COLORS : QUANTITY_COLORS;
      const idx = flag === "granularity_mismatch" ? granIdx++ : qtyIdx++;
      partGroups[key] = [palette[idx % palette.length]];
    }
    for (const [, row] of displayRowEntries) {
      const flag = String(row.conflictFlag ?? "none");
      if (flag !== "granularity_mismatch" && flag !== "quantity_conflict") continue;
      const pn = String(row.customerPartNumber ?? "");
      const key = `${flag}::${pn}`;
      const cls = partGroups[key]?.[0] ?? "";
      map.set(`${flag}::${pn}`, cls);
    }
    return map;
  }, [displayRowEntries]);

  const isTaskRunning = selectedTask?.status === "running" || selectedTask?.status === "processing";
  const isTaskCompleted = selectedTask?.status === "completed" || selectedTask?.status === "published";
  const isWaitingHuman = selectedTask?.status === "waiting_human_decision";
  const isTaskFailed = selectedTask?.status === "failed";

  const selectedRevision = selectedTask ? `${selectedTask.id}::${selectedTask.resultRevision ?? ""}` : null;

  useEffect(() => {
    if (selectedRevision === prevRevisionRef.current) return;
    const prevTaskId = prevRevisionRef.current?.split("::")[0] ?? null;
    const currTaskId = selectedRevision?.split("::")[0] ?? null;
    prevRevisionRef.current = selectedRevision;

    if (prevTaskId === currTaskId && localRevRef.current !== null) {
      return;
    }

    const next = new Map<string, OrderType>();
    for (const [rowId, row] of rowEntries) {
      const ot = String(row.classification ?? "uncertain");
      next.set(rowId, ot === "confirmed" || ot === "forecast" ? ot : "uncertain");
    }
    setOrderTypeMap(next);
    setDeletedRowIds(new Set());
    setTaskStaleState(null);
    setLocalResultRevision(null);
    localRevRef.current = null;
    setLocalRowOverrides(new Map());
    setLocalNewRows([]);
    setIsAddingRow(false);
    setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
    setNewRowErrors({});
  }, [rowEntries, selectedRevision]);

  const bulkOrderState = useMemo(() => {
    const vals = Array.from(orderTypeMap.values());
    if (vals.length > 0 && vals.every((v) => v === "confirmed")) return "firm";
    if (vals.length > 0 && vals.every((v) => v === "forecast")) return "forecast";
    return "mixed";
  }, [orderTypeMap]);

  const toggleOrderType = useCallback((rowId: string) => {
    setOrderTypeMap((prev) => {
      const next = new Map(prev);
      const current = next.get(rowId) ?? "uncertain";
      next.set(rowId, current === "confirmed" ? "forecast" : "confirmed");
      return next;
    });
  }, []);

  const bulkToggleOrderType = useCallback(() => {
    setOrderTypeMap((prev) => {
      const values = Array.from(prev.values());
      const allConfirmed = values.length > 0 && values.every((v) => v === "confirmed");
      const allForecast = values.length > 0 && values.every((v) => v === "forecast");
      const target: OrderType = allConfirmed ? "forecast" : allForecast ? "confirmed" : "confirmed";
      const next = new Map(prev);
      for (const key of next.keys()) next.set(key, target);
      return next;
    });
  }, []);

  const toggleMappingSort = useCallback(() => {
    setMappingSortOrder((prev) => (prev === null ? "asc" : prev === "asc" ? "desc" : null));
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setDeletedRowIds((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      return next;
    });
  }, []);

  const startEditing = useCallback((rowId: string, field: string, currentValue: unknown) => {
    if (!isWaitingHuman) return;
    setEditingCell({ rowId, field });
    setEditValue(currentValue != null ? String(currentValue) : "");
  }, [isWaitingHuman]);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingCell || !selectedTask) return;
    const { rowId, field } = editingCell;

    if (rowId.startsWith("new_")) {
      const val = editValue.trim();
      setLocalNewRows((prev) => prev.map((r) => {
        if (r.id !== rowId) return r;
        if (field === "customerPartNumber") return { ...r, customerPartNumber: val };
        if (field === "quantity") {
          const parsed = parseInt(val, 10);
          return { ...r, quantity: isNaN(parsed) || parsed < 0 ? r.quantity : parsed };
        }
        if (field === "dateInfo") return { ...r, dateInfo: val };
        return r;
      }));
      cancelEditing();
      return;
    }

    const row = selectedTask.resultRows?.[rowId];
    const originalValue = row ? row[field] : null;
    const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    const snakeField = camelToSnake(field);

    let newValue: string | number | null = editValue.trim() || null;
    if (snakeField === "quantity" && newValue !== null) {
      const parsed = parseInt(newValue, 10);
      if (isNaN(parsed) || parsed < 0) {
        cancelEditing();
        return;
      }
      newValue = parsed;
    }

    if (String(newValue ?? "") === String(originalValue ?? "")) {
      cancelEditing();
      return;
    }

    const revision = localResultRevision ?? selectedTask.resultRevision;
    try {
      const res = await patchRow(selectedTask.id, rowId, revision, { [snakeField]: newValue });
      setLocalResultRevision(res.resultRevision);
      localRevRef.current = res.resultRevision;
      setTaskStaleState(res.taskStaleState);
      setLocalRowOverrides((prev) => {
        const next = new Map(prev);
        next.set(rowId, { ...next.get(rowId), ...res.row });
        return next;
      });
    } catch (err) {
      console.error("Patch row failed:", err);
      refresh();
    } finally {
      cancelEditing();
    }
  }, [editingCell, editValue, selectedTask, localResultRevision, cancelEditing, refresh]);

  const getRowValue = useCallback((rowId: string, field: string, originalValue: unknown): unknown => {
    const override = localRowOverrides.get(rowId);
    if (override && field in override) return override[field];
    return originalValue;
  }, [localRowOverrides]);

  const isFieldStale = useCallback((fieldName: string): boolean => {
    if (!taskStaleState) return false;
    const camelToSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
    return taskStaleState.staleFieldNames.includes(camelToSnake(fieldName));
  }, [taskStaleState]);

  const handleProceed = useCallback(async () => {
    if (!selectedTask) return;
    setIsProceedLoading(true);
    try {
      const overrides: Record<string, string> = {};
      for (const [rowId, classification] of orderTypeMap) {
        if (classification === "confirmed" || classification === "forecast") {
          overrides[rowId] = classification;
        }
      }
      const deleted = deletedRowIds.size > 0 ? Array.from(deletedRowIds) : undefined;
      const added = localNewRows.length > 0
        ? localNewRows.map((r) => ({ customer_part_number: r.customerPartNumber, quantity: r.quantity, date_info: r.dateInfo, date_format: r.dateFormat }))
        : undefined;
      const revision = localResultRevision ?? selectedTask.resultRevision;
      await proceedTask(selectedTask.id, revision, overrides, deleted, added);
      setTaskStaleState(null);
      setLocalResultRevision(null);
      localRevRef.current = null;
      setLocalRowOverrides(new Map());
      setLocalNewRows([]);
      refresh();
    } catch (err) {
      console.error("Proceed failed:", err);
    } finally {
      setIsProceedLoading(false);
    }
  }, [selectedTask, orderTypeMap, deletedRowIds, localNewRows, localResultRevision, refresh]);

  const handleSaveNewRow = useCallback(() => {
    const errors: Record<string, string> = {};
    if (!newRowData.customerPartNumber.trim()) errors.customerPartNumber = "必填";
    const qty = parseInt(newRowData.quantity, 10);
    if (!newRowData.quantity.trim() || isNaN(qty) || qty < 0) errors.quantity = "请输入有效数量";
    if (!newRowData.dateInfo.trim()) {
      errors.dateInfo = "必填";
    }
    const dateResult = newRowData.dateInfo.trim() ? detectDateFormat(newRowData.dateInfo) : null;
    if (newRowData.dateInfo.trim() && !dateResult) {
      errors.dateInfo = "格式: 2026-06-23, 2026-W26, 或 2026-06";
    }

    if (Object.keys(errors).length > 0) {
      setNewRowErrors(errors);
      return;
    }

    setLocalNewRows((prev) => [
      ...prev,
      {
        id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        customerPartNumber: newRowData.customerPartNumber.trim(),
        quantity: qty,
        dateInfo: dateResult!.dateInfo,
        dateFormat: dateResult!.dateFormat,
      },
    ]);
    setIsAddingRow(false);
    setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
    setNewRowErrors({});
  }, [newRowData]);

  const handleCancelNewRow = useCallback(() => {
    setIsAddingRow(false);
    setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
    setNewRowErrors({});
  }, []);

  const handleSelectTask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setHasUserSelected(true);
  }, []);

  const handleStartAddingRow = useCallback(() => {
    setIsAddingRow(true);
  }, []);

  const handleRemoveLocalNewRow = useCallback((rowId: string) => {
    setLocalNewRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const handleNewRowFieldChange = useCallback((field: keyof NewRowData, value: string) => {
    setNewRowData((prev) => ({ ...prev, [field]: value }));
    setNewRowErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const timeline: TimelineEntry[] = useMemo(() => {
    if (!selectedTask) return [];
    const traceMap = new Map<string, typeof selectedTask.traceSteps[number]>();
    for (const step of selectedTask.traceSteps) {
      traceMap.set(step.stepName, step);
    }
    const currentStep = selectedTask.pipelineStep;
    const currentIdx = currentStep ? PIPELINE_STEPS.indexOf(currentStep as typeof PIPELINE_STEPS[number]) : -1;

    return PIPELINE_STEPS.map((key, idx) => {
      const traceEntry = traceMap.get(key);
      const label = STEP_LABELS[key] ?? key;
      let state: TimelineEntry["state"] = "pending";
      let reviewReason: string | null = null;

      const isBlockedHere = isWaitingHuman && selectedTask.reviewSummary?.blockedAtStep === key;

      if (isBlockedHere) {
        state = "review";
        reviewReason = selectedTask.reviewSummary?.reason ?? null;
      } else if (isTaskCompleted) {
        state = "completed";
      } else if (traceEntry) {
        state = traceEntry.status === "completed" ? "completed"
          : traceEntry.status === "completed_with_errors" ? "completed"
          : traceEntry.status === "failed" ? "failed"
          : traceEntry.status === "skipped" ? "completed"
          : "current";
      } else if (currentStep === key) {
        if (isWaitingHuman) state = "review";
        else if (isTaskFailed) state = "failed";
        else state = "current";
      } else if (currentIdx >= 0 && idx < currentIdx) {
        state = "completed";
      }

      return { key, label, state, summary: translatePipelineSummary(traceEntry?.outputSummary), reviewReason: translatePipelineSummary(reviewReason) };
    });
  }, [selectedTask, isTaskCompleted, isWaitingHuman, isTaskFailed]);

  const resultHref = (() => {
    if (!selectedTask || !isTaskCompleted) return "";
    const resultParams = new URLSearchParams();
    const lang = params.get("lang");
    if (lang) resultParams.set("lang", lang);
    resultParams.set("tab", resultTabForTask(selectedTask.taskType));
    resultParams.set("sourceTaskId", selectedTask.id);
    if (selectedAttachment?.fileName) resultParams.set("sourceFile", selectedAttachment.fileName);
    return `/orders?${resultParams.toString()}`;
  })();

  return (
    <>
      <div className="subnav">
        <Link href="/task-workbench">{t.inbox}</Link>
        <Link className="active" href="/parse-review">
          {t.parse}
        </Link>
        <Link href="/orders">{t.order}</Link>
      </div>
      <div className="grid-3 screen-fill">
        <TaskListPanel
          locale={locale}
          tasks={instanceItems}
          selectedTask={selectedTask}
          customers={customers}
          customerFilter={customerFilter}
          statusFilter={statusFilter}
          timeFilter={timeFilter}
          customerOptions={taskCustomers}
          statusOptions={statusOptions}
          onCustomerFilterChange={setCustomerFilter}
          onStatusFilterChange={setStatusFilter}
          onTimeFilterChange={setTimeFilter}
          onSelectTask={handleSelectTask}
          onRefresh={refresh}
        />
        <MiddlePanel
          locale={locale}
          selectedTask={selectedTask}
          selectedMail={selectedMail}
          selectedAttachment={selectedAttachment}
          isBodyTextTask={isBodyTextTask}
          rows={rows}
          rowIds={rowIds}
          orderTypeMap={orderTypeMap}
          bulkOrderState={bulkOrderState}
          mappingSortOrder={mappingSortOrder}
          conflictColorMap={conflictColorMap}
          isWaitingHuman={isWaitingHuman}
          isAddingRow={isAddingRow}
          editingCell={editingCell}
          editValue={editValue}
          localNewRows={localNewRows}
          newRowData={newRowData}
          newRowErrors={newRowErrors}
          langParam={params.get("lang")}
          getRowValue={getRowValue}
          isFieldStale={isFieldStale}
          onToggleMappingSort={toggleMappingSort}
          onBulkToggleOrderType={bulkToggleOrderType}
          onStartAddingRow={handleStartAddingRow}
          onToggleOrderType={toggleOrderType}
          onDeleteRow={deleteRow}
          onStartEditing={startEditing}
          onEditValueChange={setEditValue}
          onCommitEdit={commitEdit}
          onCancelEditing={cancelEditing}
          onRemoveLocalNewRow={handleRemoveLocalNewRow}
          onNewRowFieldChange={handleNewRowFieldChange}
          onSaveNewRow={handleSaveNewRow}
          onCancelNewRow={handleCancelNewRow}
        />
        <AgentFlowPanel
          locale={locale}
          selectedTask={selectedTask}
          timeline={timeline}
          isTaskRunning={isTaskRunning}
          isWaitingHuman={isWaitingHuman}
          isProceedLoading={isProceedLoading}
          resultHref={resultHref}
          taskStaleState={taskStaleState}
          stepLabels={STEP_LABELS}
          onProceed={handleProceed}
          onRefresh={refresh}
        />
      </div>
    </>
  );
}
