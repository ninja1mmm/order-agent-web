"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Circle, FileSearch, LoaderCircle, Play, RefreshCw, Trash2 } from "lucide-react";

import { BACKEND_URL } from "../../../api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/ui/select";
import {
  type Locale,
  copy,
  backendDateMs,
  customerLabel,
  customerLabelFromId,
  formatDateTime,
  taskStatusLabel,
  useCustomerConfig,
  useWorkspacePolling,
} from "./shared";
import { PdfViewer, ExcelViewer } from "./components";
import { proceedTask, patchRow, type TaskStaleState } from "../../../services/tasks";

const DEFAULT_STATUS_FILTER = "__all__";
const ACTIVE_ONLY_FILTER = "__active__";
const ACTIVE_STATUSES = new Set(["queued", "pending", "running", "processing", "waiting_human_decision"]);
type StatusBadgeVariant = "green" | "amber" | "red" | "slate";

function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xlsm") || lower.endsWith(".xls");
}

function taskTime(value: string | null | undefined): number {
  return backendDateMs(value);
}

function statusFilterFromParam(status: string | null) {
  if (!status) return DEFAULT_STATUS_FILTER;
  if (status === "processing") return "running";
  if (status === "published") return "completed";
  return status;
}

function statusBadgeVariant(status: string): StatusBadgeVariant {
  if (status === "completed" || status === "published") return "green";
  if (status === "running" || status === "processing" || status === "waiting_human_decision") return "amber";
  if (status === "failed" || status === "cancelled") return "red";
  return "slate";
}

function resultTabForTask(taskType: string | undefined): "forecast" | "shipping" {
  return taskType === "extract_forecast" ? "forecast" : "shipping";
}

const PIPELINE_STEPS = ["extraction", "date_expansion", "conflict_resolution", "material_mapping", "published"] as const;
const STEP_LABELS: Record<string, Record<Locale, string>> = {
  extraction: { zh: "AI 提取", en: "AI Extraction" },
  date_expansion: { zh: "日期扩展", en: "Date Expansion" },
  conflict_resolution: { zh: "冲突检测", en: "Conflict Check" },
  material_mapping: { zh: "料号匹配", en: "Material Mapping" },
  published: { zh: "已发布", en: "Published" },
};

type TimelineEntry = {
  key: string;
  label: string;
  state: "completed" | "current" | "pending" | "failed" | "review";
  summary: string | null;
  reviewReason: string | null;
};

export function LiveParseReview({ locale }: { locale: Locale }) {
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
  const [orderTypeMap, setOrderTypeMap] = useState<Map<string, "confirmed" | "forecast" | "uncertain">>(new Map());
  const [isProceedLoading, setIsProceedLoading] = useState(false);
  const [mappingSortOrder, setMappingSortOrder] = useState<"asc" | "desc" | null>(null);
  const [deletedRowIds, setDeletedRowIds] = useState<Set<string>>(new Set());
  const [taskStaleState, setTaskStaleState] = useState<TaskStaleState | null>(null);
  const [localResultRevision, setLocalResultRevision] = useState<number | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [localRowOverrides, setLocalRowOverrides] = useState<Map<string, Record<string, unknown>>>(new Map());
  const effectiveTaskId = hasUserSelected ? selectedTaskId : (targetTaskId ?? selectedTaskId);

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
      { value: ACTIVE_ONLY_FILTER, label: locale === "en" ? "Active" : "进行中" },
      { value: "queued", label: taskStatusLabel("queued", locale) },
      { value: "waiting_human_decision", label: taskStatusLabel("waiting_human_decision", locale) },
      { value: "completed", label: taskStatusLabel("completed", locale) },
      { value: "failed", label: taskStatusLabel("failed", locale) },
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
        if (task.status === "skipped" || task.status === "cancelled") return false;
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

  type OrderType = "confirmed" | "forecast" | "uncertain";

  useEffect(() => {
    const next = new Map<string, OrderType>();
    for (const [rowId, row] of rowEntries) {
      const ot = String(row.classification ?? "uncertain");
      next.set(rowId, ot === "confirmed" || ot === "forecast" ? ot : "uncertain");
    }
    setOrderTypeMap(next);
    setDeletedRowIds(new Set());
    setTaskStaleState(null);
    setLocalResultRevision(null);
    setLocalRowOverrides(new Map());
  }, [rowEntries]);

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
      const revision = localResultRevision ?? selectedTask.resultRevision;
      await proceedTask(selectedTask.id, revision, overrides, deleted);
      setTaskStaleState(null);
      setLocalResultRevision(null);
      setLocalRowOverrides(new Map());
      refresh();
    } catch (err) {
      console.error("Proceed failed:", err);
    } finally {
      setIsProceedLoading(false);
    }
  }, [selectedTask, orderTypeMap, deletedRowIds, localResultRevision, refresh]);

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
      const label = STEP_LABELS[key]?.[locale] ?? key;
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

      return { key, label, state, summary: traceEntry?.outputSummary ?? null, reviewReason };
    });
  }, [selectedTask, locale, isTaskCompleted, isWaitingHuman, isTaskFailed]);

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
        <aside className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.attachmentTasks}</h2>
            <Button variant="ghost" size="icon" aria-label={t.refresh} onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="panel-body stack">
            <div className="filter-bar" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <FilterSelect label={t.filterCustomer} value={customerFilter} options={taskCustomers} onChange={setCustomerFilter} />
              <FilterSelect
                label={t.filterStatus}
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label={t.filterTime}
                value={timeFilter}
                options={["今天", "最近 7 天", "最近 30 天", "最近 60 天"]}
                onChange={setTimeFilter}
              />
            </div>
            {instanceItems.map((task) => {
              const taskLabel = task.attachmentId === null ? "Email Body" : (task.attachmentFileName ?? task.id);
              const instanceKey = `${task.mailMessageId}::${task.attachmentId ?? "__body__"}`;
              const selectedKey = selectedTask ? `${selectedTask.mailMessageId}::${selectedTask.attachmentId ?? "__body__"}` : "";
              return (
                <button
                  type="button"
                  key={instanceKey}
                  className={`list-item ${instanceKey === selectedKey ? "selected" : ""}`}
                  onClick={() => { setSelectedTaskId(task.id); setHasUserSelected(true); }}
                >
                  <p className="item-title task-filename" title={taskLabel}>{taskLabel}</p>
                  <p className="item-meta task-status-desc">
                    {customerLabelFromId(customers, task.customerId, task.customerName)} · {t.receivedAt} {formatDateTime(task.receivedAt ?? task.mailCreatedAt, locale)} ·{" "}
                    {taskStatusLabel(task.status, locale)}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>
        <section className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title truncate" title={isBodyTextTask ? "Email Body" : selectedAttachment?.fileName}>
              {isBodyTextTask ? "Email Body" : (selectedAttachment?.fileName ?? t.attachmentPreview)}
            </h2>
            <Badge variant="slate">{t.readonly}</Badge>
          </div>
          <div className="panel-body stack">
            {isBodyTextTask && selectedMail ? (
              <div className="mail-body-viewer">
                <div style={{ whiteSpace: "pre-wrap", padding: 16, fontSize: 13, lineHeight: 1.7, color: "#334155" }}>
                  {selectedMail.bodyText}
                  {(() => {
                    const seenIds = new Set<string>();
                    const allImages: { key: string; artifactId: string; alt: string }[] = [];
                    for (const img of selectedMail.inlineImages ?? []) {
                      if (!seenIds.has(img.fileArtifactId)) {
                        seenIds.add(img.fileArtifactId);
                        allImages.push({ key: img.imageId, artifactId: img.fileArtifactId, alt: "inline" });
                      }
                    }
                    for (const att of selectedMail.attachments) {
                      if (att.contentType?.startsWith("image/") && att.fileArtifactId && !seenIds.has(att.fileArtifactId)) {
                        seenIds.add(att.fileArtifactId);
                        allImages.push({ key: att.attachmentId, artifactId: att.fileArtifactId, alt: att.fileName });
                      }
                    }
                    return allImages.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                        {allImages.map((img) => (
                          <img
                            key={img.key}
                            src={`${BACKEND_URL}/api/files/${img.artifactId}/content`}
                            alt={img.alt}
                            style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4, alignSelf: "flex-start" }}
                          />
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            ) : selectedAttachment?.fileArtifactId ? (
              isExcelFile(selectedAttachment.fileName)
                ? <ExcelViewer fileArtifactId={selectedAttachment.fileArtifactId} locale={locale} />
                : <PdfViewer fileArtifactId={selectedAttachment.fileArtifactId} locale={locale} />
            ) : (
              <p className="item-meta">{t.noAttachment}</p>
            )}
            {rows.length > 0 ? (
              <div className="scroll-x">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Customer P/N</th>
                      <th>Internal P/N</th>
                      <th>Designation</th>
                      <th>Quantity</th>
                      <th>Date</th>
                      <th>Week</th>
                      <th
                        style={{ cursor: "pointer", userSelect: "none" }}
                        title={locale === "zh" ? "点击按映射状态排序" : "Click to sort by mapping status"}
                        onClick={toggleMappingSort}
                      >
                        Mapping{mappingSortOrder === "asc" ? " ▲" : mappingSortOrder === "desc" ? " ▼" : ""}
                      </th>
                      <th>{locale === "zh" ? "冲突" : "Conflict"}</th>
                      <th
                        className="order-type-header"
                        title={locale === "zh" ? "点击切换全部" : "Click to toggle all"}
                        onClick={bulkToggleOrderType}
                      >
                        {locale === "zh" ? "订单类型" : "Order Type"}
                      </th>
                      <th style={{ width: 36 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const rowId = rowIds[idx];
                      const ot = orderTypeMap.get(rowId) ?? "uncertain";
                      const conflict = String(row.conflictFlag ?? "none");
                      const pn = String(row.customerPartNumber ?? "");
                      const conflictClass =
                        (conflict === "granularity_mismatch" || conflict === "quantity_conflict")
                          ? (conflictColorMap.get(`${conflict}::${pn}`) ?? "")
                          : "";

                      const cellValue = (field: string) => getRowValue(rowId, field, row[field]);
                      const isEditing = (field: string) =>
                        editingCell?.rowId === rowId && editingCell?.field === field;

                      const editableCell = (field: string, displayValue?: string) => {
                        const val = cellValue(field);
                        const display = displayValue ?? String(val ?? "");
                        const stale = isFieldStale(field);

                        if (isEditing(field)) {
                          return (
                            <input
                              className="inline-edit-input"
                              type={field === "quantity" ? "number" : "text"}
                              value={editValue}
                              autoFocus
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") commitEdit();
                                else if (e.key === "Escape") cancelEditing();
                              }}
                            />
                          );
                        }
                        return (
                          <span
                            className={`editable-cell${isWaitingHuman ? " editable" : ""}${stale ? " stale" : ""}`}
                            onClick={() => startEditing(rowId, field, val)}
                            title={stale ? (locale === "zh" ? "此字段将在继续流程后重新计算" : "Will be recalculated on Proceed") : undefined}
                          >
                            {display || <span className="cell-placeholder">—</span>}
                          </span>
                        );
                      };

                      const derivedCell = (field: string, content: React.ReactNode) => {
                        const stale = isFieldStale(field);
                        return (
                          <span className={stale ? "stale" : ""} title={stale ? (locale === "zh" ? "待重新计算" : "Pending re-eval") : undefined}>
                            {content}
                          </span>
                        );
                      };

                      return (
                        <tr key={rowId} className={conflictClass}>
                          <td>{editableCell("customerPartNumber")}</td>
                          <td>{derivedCell("internalPartNumber", String(cellValue("internalPartNumber") ?? ""))}</td>
                          <td>{editableCell("designation")}</td>
                          <td>{editableCell("quantity")}</td>
                          <td>{editableCell("dateInfo", String(cellValue("expandedDay") ?? cellValue("dateInfo") ?? ""))}</td>
                          <td>{derivedCell("expandedWeek", String(cellValue("expandedWeek") ?? ""))}</td>
                          <td>
                            {derivedCell("mappingStatus", (() => {
                              const ms = cellValue("mappingStatus");
                              if (ms === "unmapped") {
                                return (
                                  <Link
                                    href={`/system-settings?tab=materials&customerId=${encodeURIComponent(selectedTask?.customerId ?? "")}&addPN=${encodeURIComponent(String(cellValue("customerPartNumber") ?? ""))}${params.get("lang") ? `&lang=${params.get("lang")}` : ""}`}
                                  >
                                    <Badge variant="amber" style={{ cursor: "pointer" }}>unmapped</Badge>
                                  </Link>
                                );
                              }
                              if (ms === "mapped") return <Badge variant="green">mapped</Badge>;
                              return String(ms ?? "");
                            })())}
                          </td>
                          <td>
                            {derivedCell("conflictFlag", (() => {
                              if (conflict === "granularity_mismatch") {
                                return (
                                  <Badge variant="amber" title={String(row.conflictDetails ?? "")}>
                                    {locale === "zh" ? "粒度不匹配" : "granularity"}
                                  </Badge>
                                );
                              }
                              if (conflict === "quantity_conflict") {
                                return (
                                  <Badge variant="red" title={String(row.conflictDetails ?? "")}>
                                    {locale === "zh" ? "数量冲突" : "qty conflict"}
                                  </Badge>
                                );
                              }
                              if (conflict === "uncertain") {
                                return (
                                  <Badge variant="slate" title={String(row.conflictDetails ?? "")}>
                                    {locale === "zh" ? "不确定" : "uncertain"}
                                  </Badge>
                                );
                              }
                              return null;
                            })())}
                          </td>
                          <td>
                            <div className="order-type-switch" onClick={() => toggleOrderType(rowId)}>
                              <span className={`order-type-option${ot === "confirmed" ? " active-confirmed" : ""}`}>
                                {locale === "zh" ? "确认" : "Firm"}
                              </span>
                              <span className={`order-type-option${ot === "forecast" ? " active-forecast" : ""}`}>
                                {locale === "zh" ? "预测" : "Forecast"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="row-delete-btn"
                              title={locale === "zh" ? "删除此行" : "Remove this row"}
                              onClick={() => deleteRow(rowId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </section>
        <aside className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.agentFlow}</h2>
            {selectedTask ? (
              <Badge variant={statusBadgeVariant(selectedTask.status)} className={isTaskRunning ? "agent-running-badge" : ""}>
                {taskStatusLabel(selectedTask.status, locale)}
              </Badge>
            ) : null}
          </div>
          <div className="panel-body stack timeline">
            {selectedTask && timeline.length > 0 ? (
              <>
                {timeline.map((entry, idx) => (
                  <div className={`step step-${entry.state}`} key={entry.key}>
                    <div className="step-title">
                      {entry.state === "completed" ? (
                        <Check className="h-3.5 w-3.5 step-icon-done" aria-hidden="true" />
                      ) : entry.state === "current" ? (
                        <LoaderCircle className="step-spinner" aria-hidden="true" />
                      ) : entry.state === "review" ? (
                        <AlertTriangle className="h-3.5 w-3.5 step-icon-review" aria-hidden="true" />
                      ) : entry.state === "failed" ? (
                        <AlertTriangle className="h-3.5 w-3.5 step-icon-failed" aria-hidden="true" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 step-icon-pending" aria-hidden="true" />
                      )}
                      {entry.label}
                      {entry.state === "completed" ? (
                        <Badge variant="slate" style={{ marginLeft: 6 }}>done</Badge>
                      ) : entry.state === "failed" ? (
                        <Badge variant="red" style={{ marginLeft: 6 }}>failed</Badge>
                      ) : entry.state === "review" ? (
                        <Badge variant="amber" style={{ marginLeft: 6 }}>{locale === "zh" ? "待审核" : "review"}</Badge>
                      ) : null}
                    </div>
                    {entry.summary ? <div className="step-meta">{entry.summary}</div> : null}
                    {entry.reviewReason ? (
                      <div className="step-meta step-review-reason">{entry.reviewReason}</div>
                    ) : null}
                    {entry.state === "review" && isWaitingHuman ? (
                      <>
                        {taskStaleState && taskStaleState.pendingReevalSteps.length > 0 ? (
                          <div className="step-meta" style={{ color: "#d97706", fontStyle: "italic", marginBottom: 4 }}>
                            {locale === "zh"
                              ? `已修改字段，继续后将重新执行: ${taskStaleState.pendingReevalSteps.map((s) => STEP_LABELS[s]?.[locale] ?? s).join(", ")}`
                              : `Edited fields require re-evaluation: ${taskStaleState.pendingReevalSteps.map((s) => STEP_LABELS[s]?.[locale] ?? s).join(", ")}`}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className="proceed-btn"
                          disabled={isProceedLoading}
                          onClick={handleProceed}
                        >
                          {isProceedLoading ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          {locale === "zh" ? "继续流程" : "Proceed"}
                        </button>
                      </>
                    ) : null}
                    {idx === timeline.length - 1 && resultHref ? (
                      <div className="result-actions">
                        <Link className="btn small agent-result-link" href={resultHref}>
                          <FileSearch className="h-3.5 w-3.5" />
                          {t.viewResult}
                        </Link>
                      </div>
                    ) : null}
                  </div>
                ))}
                {selectedTask.warnings.length > 0 ? (
                  <div className="step step-warnings">
                    <div className="step-title">
                      <AlertTriangle className="h-3.5 w-3.5 step-icon-review" aria-hidden="true" />
                      {locale === "zh" ? "警告" : "Warnings"}
                      <Badge variant="amber" style={{ marginLeft: 6 }}>{selectedTask.warnings.length}</Badge>
                    </div>
                    <ul className="step-meta" style={{ paddingLeft: 16, margin: 0 }}>
                      {selectedTask.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : selectedTask && isTaskRunning ? (
              <div className="step">
                <div className="step-title">
                  <LoaderCircle className="step-spinner" aria-hidden="true" />
                  {locale === "zh" ? "流程启动中..." : "Pipeline starting..."}
                </div>
              </div>
            ) : selectedTask ? (
              <p className="item-meta">{locale === "zh" ? "暂无执行流数据" : "No pipeline data yet"}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
