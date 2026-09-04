"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Check, ChevronLeft, ChevronRight, Download, GitMerge, Info, LoaderCircle, Play, RotateCcw, Table2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogBody, DialogContent, DialogHeader, DialogOverlay, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  backendDateMs,
  customerLabel,
  formatDateTime,
  taskStatusLabel,
  useCustomerConfig,
  useLocale,
  useWorkspacePolling,
} from "../../_components/shared";
import {
  proceedTask,
  patchRow,
  publishTask,
  resetTaskReview,
  getEffectiveRows,
  bulkMergeStrategy,
  setTaskExcluded,
  type BulkMergeStrategy,
  addRow as addRowApi,
  deleteRow as deleteRowApi,
  type TaskStaleState,
} from "@/services/tasks";
import { addMailSource, getMailTasks } from "@/services/mail";
import type { MailTaskListResponse } from "@/services/inbox";
import type { DemandKind } from "@/services/orders";
import { OrdersFilters } from "../../orders/_components/orders-filters";
import { MailSourcePanel } from "./left/mail-source-panel";
import { MiddlePanel } from "./middle/middle-panel";
import type { LocalNewRow, NewRowData, OrderType } from "./parse-review-types";

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

export function ParseReviewPage() {
  const locale = useLocale();
  const { customers } = useCustomerConfig();
  const params = useSearchParams();
  const { tasks, mails, refresh } = useWorkspacePolling();
  const targetTaskId = params.get("taskId");
  const targetMailId = params.get("mailId");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [orderTypeMap, setOrderTypeMap] = useState<Map<string, OrderType>>(new Map());
  const [isProceedLoading, setIsProceedLoading] = useState(false);
  const [isPublishLoading, setIsPublishLoading] = useState(false);
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
  const [reviewStep, setReviewStep] = useState<1 | 2 | 3 | 4>(1);
  const [dateOffset, setDateOffset] = useState("2");
  const [mergeStrategy, setMergeStrategy] = useState<BulkMergeStrategy>("replace");
  const [batchLoading, setBatchLoading] = useState(false);
  const [mergeConfirmOpen, setMergeConfirmOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [reviewActionError, setReviewActionError] = useState<string | null>(null);
  const [mailTaskList, setMailTaskList] = useState<MailTaskListResponse | null>(null);
  const [mailTaskLoading, setMailTaskLoading] = useState(false);
  const [scopeTaskId, setScopeTaskId] = useState<string | null>(null);
  const [previewSource, setPreviewSource] = useState<{ kind: "body" } | { kind: "attachment"; attachmentId: string; sheetName?: string } | null>(null);
  const [effectiveTaskRows, setEffectiveTaskRows] = useState<{ taskId: string; rows: Record<string, Record<string, unknown>>; resultRevision: number } | null>(null);
  const effectiveTaskId = hasUserSelected ? selectedTaskId : (targetTaskId ?? selectedTaskId);
  const prevRevisionRef = useRef<string | null>(null);
  const localRevRef = useRef<number | null>(null);
  const editCommitInFlightRef = useRef(false);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (targetMailId && task.mailMessageId !== targetMailId) return false;
        if (task.status === "skipped") return false;
        return true;
      })
      .sort((a, b) => {
        const taskTimeDelta = backendDateMs(b.requestedAt) - backendDateMs(a.requestedAt);
        if (taskTimeDelta !== 0) return taskTimeDelta;
        return backendDateMs(b.receivedAt) - backendDateMs(a.receivedAt);
      });
  }, [targetMailId, tasks]);

  const imageAttachmentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mail of mails) {
      for (const att of mail.attachments) {
        if (att.contentType?.startsWith("image/")) ids.add(att.attachmentId);
      }
    }
    return ids;
  }, [mails]);

  const instanceItems = useMemo(
    () => filteredTasks.filter((task) => !task.attachmentId || !imageAttachmentIds.has(task.attachmentId)),
    [filteredTasks, imageAttachmentIds],
  );

  const workspaceSelectedTask = useMemo(() => {
    const fromEffective = filteredTasks.find((task) => task.id === effectiveTaskId);
    if (fromEffective) return fromEffective;
    if (!hasUserSelected && targetTaskId) {
      const fromAll = tasks.find((task) => task.id === targetTaskId);
      if (fromAll && (!targetMailId || fromAll.mailMessageId === targetMailId)) return fromAll;
    }
    return instanceItems[0];
  }, [effectiveTaskId, filteredTasks, hasUserSelected, instanceItems, targetMailId, targetTaskId, tasks]);
  const selectedTask = useMemo(() => workspaceSelectedTask && effectiveTaskRows?.taskId === workspaceSelectedTask.id
    ? { ...workspaceSelectedTask, resultRows: effectiveTaskRows.rows, resultRevision: effectiveTaskRows.resultRevision }
    : workspaceSelectedTask, [effectiveTaskRows, workspaceSelectedTask]);
  const selectedMail = mails.find((mail) => mail.id === targetMailId) ?? mails.find((mail) => mail.id === selectedTask?.mailMessageId);
  const selectedMailTasks = useMemo(
    () => instanceItems.filter((task) => task.mailMessageId === selectedMail?.id),
    [instanceItems, selectedMail?.id],
  );
  const mergeCustomerOptions = useMemo(() => {
    const options = customers.map((customer) => ({ value: customer.id, label: customerLabel(customer) }));
    if (selectedMail?.customerId && !options.some((option) => option.value === selectedMail.customerId)) {
      options.unshift({ value: selectedMail.customerId, label: selectedMail.customerName || selectedMail.customerId });
    }
    return [{ value: "__all__", label: "全部客户" }, ...options];
  }, [customers, selectedMail]);
  const selectedTaskIsBody = selectedTask?.attachmentId === null;
  const selectedTaskAttachment = selectedTaskIsBody ? undefined : selectedMail?.attachments.find((a) => a.attachmentId === selectedTask?.attachmentId);
  const isBodyTextTask = previewSource ? previewSource.kind === "body" : selectedTaskIsBody;
  const selectedAttachment = previewSource?.kind === "attachment"
    ? selectedMail?.attachments.find((attachment) => attachment.attachmentId === previewSource.attachmentId)
    : selectedTaskAttachment;
  const previewSheetName = previewSource?.kind === "attachment" ? previewSource.sheetName : selectedTask?.targetSheetName;
  const parsedSheetNames = useMemo(
    () => selectedMailTasks
      .filter((task) => task.attachmentId === selectedAttachment?.attachmentId && task.targetSheetName)
      .map((task) => task.targetSheetName as string),
    [selectedAttachment?.attachmentId, selectedMailTasks],
  );
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
    const BLOCKING_COLORS = ["conflict-group-red", "conflict-group-crimson", "conflict-group-rose", "conflict-group-brick", "conflict-group-orange", "conflict-group-purple", "conflict-group-teal", "conflict-group-pink"];
    const INFORMATIVE_COLORS = ["conflict-group-slate", "conflict-group-amber"];
    const groupKeys = new Set<string>();
    for (const [, row] of displayRowEntries) {
      const gk = String(row.conflictGroupKey ?? "");
      if (gk) groupKeys.add(gk);
    }
    const map = new Map<string, string>();
    let blockingIdx = 0, informativeIdx = 0;
    for (const gk of groupKeys) {
      const isInformative = gk.startsWith("total|") || gk.startsWith("incomplete|");
      if (isInformative) {
        map.set(gk, INFORMATIVE_COLORS[informativeIdx++ % INFORMATIVE_COLORS.length]);
      } else {
        map.set(gk, BLOCKING_COLORS[blockingIdx++ % BLOCKING_COLORS.length]);
      }
    }
    return map;
  }, [displayRowEntries]);

  const isWaitingHuman = selectedTask?.status === "waiting_human_decision";
  const selectedTaskExcluded = mailTaskList?.tasks.find((task) => task.id === selectedTask?.id)?.excluded ?? false;
  const hasOrderTypeEdits = rowEntries.some(([rowId, row]) => {
    const original = String(row.classification ?? "uncertain");
    return (orderTypeMap.get(rowId) ?? "uncertain") !== original;
  });
  const needsRevalidation = Boolean(taskStaleState?.pendingReevalSteps.length || hasOrderTypeEdits || deletedRowIds.size || localNewRows.length);
  const preferEditedDate = Boolean(taskStaleState?.staleFieldNames.includes("expanded_day"));

  const hasBlockingConflicts = useMemo(() => {
    const BLOCKING = new Set(["quantity_conflict", "granularity_mismatch", "invalid_date", "uncertain"]);
    return visibleRowEntries.some(([, row]) => {
      const flag = String(row.conflictFlag ?? "none");
      return BLOCKING.has(flag);
    });
  }, [visibleRowEntries]);

  const loadMailTaskList = useCallback(async () => {
    if (!selectedMail) {
      setMailTaskList(null);
      return;
    }
    setMailTaskLoading(true);
    try {
      setMailTaskList(await getMailTasks(selectedMail.id));
    } catch (error) {
      console.error("Load mail tasks failed:", error);
    } finally {
      setMailTaskLoading(false);
    }
  }, [selectedMail]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadMailTaskList(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMailTaskList]);

  useEffect(() => {
    const taskId = workspaceSelectedTask?.id;
    if (!taskId) return;

    let cancelled = false;
    void getEffectiveRows(taskId)
      .then((response) => {
        if (cancelled) return;
        setEffectiveTaskRows({ taskId, rows: response.rows, resultRevision: response.resultRevision });
        setTaskStaleState(response.taskStaleState);
        setDeletedRowIds(new Set(response.deletedRowIds));
        setLocalResultRevision(response.resultRevision);
        localRevRef.current = response.resultRevision;
      })
      .catch((error) => {
        if (!cancelled) console.error("Load effective task rows failed:", error);
      });

    return () => { cancelled = true; };
  }, [workspaceSelectedTask?.id]);

  const syncEffectiveTask = useCallback(async (taskId: string) => {
    const response = await getEffectiveRows(taskId);
    setEffectiveTaskRows({ taskId, rows: response.rows, resultRevision: response.resultRevision });
    setTaskStaleState(response.taskStaleState);
    setDeletedRowIds(new Set(response.deletedRowIds));
    setLocalResultRevision(response.resultRevision);
    localRevRef.current = response.resultRevision;
    return response;
  }, []);

  const runWithFreshRevision = useCallback(async <T,>(
    taskId: string,
    revision: number,
    request: (currentRevision: number) => Promise<T>,
  ): Promise<T> => {
    try {
      return await request(revision);
    } catch (error) {
      if (!isRevisionConflict(error)) throw error;
      const effective = await syncEffectiveTask(taskId);
      return request(effective.resultRevision);
    }
  }, [syncEffectiveTask]);

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

  const bulkToggleCardOrderType = useCallback((cardRowIds: string[]) => {
    setOrderTypeMap((prev) => {
      const cardValues = cardRowIds.map((id) => prev.get(id) ?? "uncertain");
      const allConfirmed = cardValues.length > 0 && cardValues.every((v) => v === "confirmed");
      const allForecast = cardValues.length > 0 && cardValues.every((v) => v === "forecast");
      const target: OrderType = allConfirmed ? "forecast" : allForecast ? "confirmed" : "confirmed";
      const next = new Map(prev);
      for (const id of cardRowIds) next.set(id, target);
      return next;
    });
  }, []);

  const toggleMappingSort = useCallback(() => {
    setMappingSortOrder((prev) => (prev === null ? "asc" : prev === "asc" ? "desc" : null));
  }, []);

  const handleDeleteRow = useCallback(async (rowId: string) => {
    if (!selectedTask) return;
    const revision = localResultRevision ?? selectedTask.resultRevision;

    try {
      const res = await runWithFreshRevision(
        selectedTask.id,
        revision,
        (currentRevision) => deleteRowApi(selectedTask.id, rowId, currentRevision),
      );
      setLocalResultRevision(res.resultRevision);
      localRevRef.current = res.resultRevision;
      setTaskStaleState(res.taskStaleState);
      refresh();
    } catch (err) {
      console.error("Delete row failed:", err);
      setDeletedRowIds((prev) => {
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
    }
  }, [selectedTask, localResultRevision, refresh, runWithFreshRevision]);

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
    if (!editingCell || !selectedTask || editCommitInFlightRef.current) return;
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
    const changes: Record<string, string | number | null> = { [snakeField]: newValue };
    if (snakeField === "quantity" && newValue !== null) {
      const parsed = parseInt(newValue, 10);
      if (isNaN(parsed) || parsed < 0) {
        cancelEditing();
        return;
      }
      newValue = parsed;
      changes.quantity = parsed;
    }
    if (snakeField === "date_info" && newValue !== null) {
      const parsed = detectDateFormat(String(newValue));
      if (!parsed) {
        setReviewActionError("日期格式无效，请输入如 2026-09-02 的日期");
        return;
      }
      newValue = parsed.dateInfo;
      changes.date_info = parsed.dateInfo;
      changes.date_format = parsed.dateFormat;
    }

    if (String(newValue ?? "") === String(originalValue ?? "")) {
      cancelEditing();
      return;
    }

    const revision = localResultRevision ?? selectedTask.resultRevision;
    editCommitInFlightRef.current = true;
    try {
      setReviewActionError(null);
      const res = await runWithFreshRevision(
        selectedTask.id,
        revision,
        (currentRevision) => patchRow(selectedTask.id, rowId, currentRevision, changes),
      );
      setLocalResultRevision(res.resultRevision);
      localRevRef.current = res.resultRevision;
      setTaskStaleState(res.taskStaleState);
      setLocalRowOverrides((prev) => {
        const next = new Map(prev);
        next.set(rowId, {
          ...next.get(rowId),
          ...res.row,
          ...(snakeField === "date_info" ? { dateInfo: newValue, expandedDay: newValue } : {}),
        });
        return next;
      });
    } catch (err) {
      console.error("Patch row failed:", err);
      setReviewActionError(readableActionError(err, "保存修改失败"));
      refresh();
    } finally {
      editCommitInFlightRef.current = false;
      cancelEditing();
    }
  }, [editingCell, editValue, selectedTask, localResultRevision, cancelEditing, refresh, runWithFreshRevision]);

  const getRowValue = useCallback((rowId: string, field: string, originalValue: unknown): unknown => {
    const override = localRowOverrides.get(rowId);
    if (override && field in override) return override[field];
    return originalValue;
  }, [localRowOverrides]);

  const handleProceed = useCallback(async (): Promise<boolean> => {
    if (!selectedTask) return false;
    setIsProceedLoading(true);
    setReviewActionError(null);
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
      await runWithFreshRevision(
        selectedTask.id,
        revision,
        (currentRevision) => proceedTask(selectedTask.id, currentRevision, overrides, deleted, added),
      );
      setTaskStaleState(null);
      setLocalResultRevision(null);
      localRevRef.current = null;
      setLocalRowOverrides(new Map());
      setLocalNewRows([]);
      await refresh();
      await syncEffectiveTask(selectedTask.id);
      return true;
    } catch (err) {
      console.error("Proceed failed:", err);
      const message = readableActionError(err, "执行当前修改失败");
      setReviewActionError(message);
      toast.error(message);
      return false;
    } finally {
      setIsProceedLoading(false);
    }
  }, [selectedTask, orderTypeMap, deletedRowIds, localNewRows, localResultRevision, refresh, runWithFreshRevision, syncEffectiveTask]);

  const handleResetReview = useCallback(async () => {
    if (!selectedTask) return;
    setIsResetLoading(true);
    setReviewActionError(null);
    try {
      const revision = localResultRevision ?? selectedTask.resultRevision;
      await runWithFreshRevision(
        selectedTask.id,
        revision,
        (currentRevision) => resetTaskReview(selectedTask.id, currentRevision),
      );
      const effective = await getEffectiveRows(selectedTask.id);
      setEffectiveTaskRows({ taskId: selectedTask.id, rows: effective.rows, resultRevision: effective.resultRevision });
      setTaskStaleState(effective.taskStaleState);
      setLocalResultRevision(null);
      localRevRef.current = null;
      setLocalRowOverrides(new Map());
      setDeletedRowIds(new Set());
      setLocalNewRows([]);
      setResetConfirmOpen(false);
      await refresh();
      toast.success("已恢复到本次任务的原始解析结果");
    } catch (error) {
      const message = readableActionError(error, "恢复解析结果失败");
      setReviewActionError(message);
      toast.error(message);
    } finally {
      setIsResetLoading(false);
    }
  }, [localResultRevision, refresh, runWithFreshRevision, selectedTask]);

  const handlePublish = useCallback(async () => {
    if (!selectedTask) return;
    setIsPublishLoading(true);
    try {
      const revision = localResultRevision ?? selectedTask.resultRevision;
      await publishTask(selectedTask.id, revision);
      setMergeConfirmOpen(false);
      setTaskStaleState(null);
      setLocalResultRevision(null);
      localRevRef.current = null;
      setLocalRowOverrides(new Map());
      setLocalNewRows([]);
      refresh();
      void loadMailTaskList();
      toast.success("当前解析任务已 Merge 到 Orders");
    } catch (err) {
      console.error("Publish failed:", err);
      const message = readableActionError(err, "合并失败");
      setReviewActionError(message);
      toast.error(message);
    } finally {
      setIsPublishLoading(false);
    }
  }, [selectedTask, localResultRevision, refresh, loadMailTaskList]);

  const handleSaveNewRow = useCallback(async () => {
    if (!selectedTask) return;

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

    const revision = localResultRevision ?? selectedTask.resultRevision;
    try {
      const res = await runWithFreshRevision(
        selectedTask.id,
        revision,
        (currentRevision) => addRowApi(
          selectedTask.id,
          currentRevision,
          newRowData.customerPartNumber.trim(),
          qty,
          dateResult!.dateInfo,
          dateResult!.dateFormat,
        ),
      );
      setLocalResultRevision(res.resultRevision);
      localRevRef.current = res.resultRevision;
      setTaskStaleState(res.taskStaleState);
      setIsAddingRow(false);
      setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
      setNewRowErrors({});
      refresh();
    } catch (err) {
      console.error("Add row failed:", err);
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
    }
  }, [selectedTask, newRowData, localResultRevision, refresh, runWithFreshRevision]);

  const handleCancelNewRow = useCallback(() => {
    setIsAddingRow(false);
    setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
    setNewRowErrors({});
  }, []);

  const handleSelectTask = useCallback((taskId: string) => {
    const task = selectedMailTasks.find((item) => item.id === taskId);
    setSelectedTaskId(taskId);
    setHasUserSelected(true);
    setReviewStep(1);
    setPreviewSource(task?.attachmentId ? { kind: "attachment", attachmentId: task.attachmentId, sheetName: task.targetSheetName ?? undefined } : { kind: "body" });
  }, [selectedMailTasks]);

  const handleSelectBody = useCallback(() => {
    const task = selectedMailTasks.find((item) => item.attachmentId === null);
    if (task) {
      setSelectedTaskId(task.id);
      setHasUserSelected(true);
      setReviewStep(1);
    }
    setPreviewSource({ kind: "body" });
  }, [selectedMailTasks]);

  const handleSelectAttachment = useCallback((attachmentId: string, sheetName?: string) => {
    const attachmentTasks = selectedMailTasks.filter((item) => item.attachmentId === attachmentId);
    const task = (sheetName ? attachmentTasks.find((item) => item.targetSheetName === sheetName) : undefined) ?? attachmentTasks[0];
    if (task) {
      setSelectedTaskId(task.id);
      setHasUserSelected(true);
      setReviewStep(1);
    }
    setPreviewSource({ kind: "attachment", attachmentId, sheetName: sheetName ?? task?.targetSheetName ?? undefined });
  }, [selectedMailTasks]);

  const handleAddSource = useCallback(async (attachmentId: string, sheetName: string) => {
    if (!selectedMail) return;
    setMailTaskLoading(true);
    try {
      await addMailSource(selectedMail.id, attachmentId, sheetName);
      await Promise.all([refresh(), loadMailTaskList()]);
      toast.success(`已新增 ${sheetName}，后台解析已启动`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "新增解析来源失败");
    } finally {
      setMailTaskLoading(false);
    }
  }, [loadMailTaskList, refresh, selectedMail]);

  const handleAddPreviewSheet = useCallback((sheetName: string) => {
    if (!selectedAttachment) return;
    void handleAddSource(selectedAttachment.attachmentId, sheetName);
  }, [handleAddSource, selectedAttachment]);

  const handleToggleExcluded = useCallback(async (taskId: string, excluded: boolean) => {
    setScopeTaskId(taskId);
    try {
      await setTaskExcluded(taskId, excluded);
      await Promise.all([refresh(), loadMailTaskList()]);
      toast.success(excluded ? "该来源已从 Merge 范围排除" : "该来源已重新纳入 Merge 范围");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新来源范围失败");
    } finally {
      setScopeTaskId(null);
    }
  }, [loadMailTaskList, refresh]);

  const handleApplyDateOffset = useCallback(async () => {
    if (!selectedTask || !isWaitingHuman) return;
    const days = Number.parseInt(dateOffset, 10);
    if (!Number.isFinite(days) || days < 0) {
      toast.error("请输入大于或等于 0 的提前天数");
      return;
    }
    setBatchLoading(true);
    setReviewActionError(null);
    try {
      let revision = localResultRevision ?? selectedTask.resultRevision;
      let latestStale: TaskStaleState | null = null;
      const overrides = new Map(localRowOverrides);
      let updatedCount = 0;
      for (const [rowId, row] of visibleRowEntries) {
        const current = String(preferEditedDate
          ? getRowValue(rowId, "dateInfo", row.dateInfo) || getRowValue(rowId, "expandedDay", row.expandedDay) || ""
          : getRowValue(rowId, "expandedDay", row.expandedDay) || getRowValue(rowId, "dateInfo", row.dateInfo) || "");
        const shifted = shiftIsoDate(current, -days);
        if (!shifted) continue;
        const response = await runWithFreshRevision(
          selectedTask.id,
          revision,
          (currentRevision) => patchRow(selectedTask.id, rowId, currentRevision, {
            date_info: shifted,
            date_format: "day",
          }),
        );
        revision = response.resultRevision;
        setLocalResultRevision(revision);
        localRevRef.current = revision;
        latestStale = response.taskStaleState;
        overrides.set(rowId, { ...overrides.get(rowId), ...response.row, dateInfo: shifted, expandedDay: shifted });
        setTaskStaleState(latestStale);
        setLocalRowOverrides(new Map(overrides));
        updatedCount += 1;
      }
      setLocalResultRevision(revision);
      localRevRef.current = revision;
      setTaskStaleState(latestStale);
      setLocalRowOverrides(overrides);
      toast.success(`已更新 ${updatedCount} 行提货日期，正在重新校验…`);
      // Auto-revalidate since date offset always creates staleness
      void handleProceed();
    } catch (error) {
      const message = readableActionError(error, "批量调整日期失败");
      setReviewActionError(message);
      toast.error(message);
      refresh();
    } finally {
      setBatchLoading(false);
    }
  }, [dateOffset, getRowValue, handleProceed, isWaitingHuman, localResultRevision, localRowOverrides, preferEditedDate, refresh, runWithFreshRevision, selectedTask, visibleRowEntries]);

  const handleApplyMergeStrategy = useCallback(async () => {
    if (!selectedTask || !isWaitingHuman || rowIds.length === 0) return;
    setBatchLoading(true);
    setReviewActionError(null);
    try {
      const revision = localResultRevision ?? selectedTask.resultRevision;
      const response = await runWithFreshRevision(
        selectedTask.id,
        revision,
        (currentRevision) => bulkMergeStrategy(selectedTask.id, currentRevision, rowIds, mergeStrategy),
      );
      setLocalResultRevision(response.resultRevision);
      localRevRef.current = response.resultRevision;
      setLocalRowOverrides((current) => {
        const next = new Map(current);
        rowIds.forEach((rowId) => next.set(rowId, { ...next.get(rowId), mergeStrategy }));
        return next;
      });
      toast.success(`已将 ${response.updatedCount} 行设置为 ${strategyLabel(mergeStrategy)}`);
    } catch (error) {
      const message = readableActionError(error, "更新数量策略失败");
      setReviewActionError(message);
      toast.error(message);
      refresh();
    } finally {
      setBatchLoading(false);
    }
  }, [isWaitingHuman, localResultRevision, mergeStrategy, refresh, rowIds, runWithFreshRevision, selectedTask]);

  const handleRowMergeStrategy = useCallback(async (rowId: string, strategy: BulkMergeStrategy) => {
    if (!selectedTask || !isWaitingHuman) return;
    try {
      setReviewActionError(null);
      const revision = localResultRevision ?? selectedTask.resultRevision;
      const response = await runWithFreshRevision(
        selectedTask.id,
        revision,
        (currentRevision) => patchRow(selectedTask.id, rowId, currentRevision, { merge_strategy: strategy }),
      );
      setLocalResultRevision(response.resultRevision);
      localRevRef.current = response.resultRevision;
      setTaskStaleState(response.taskStaleState);
      setLocalRowOverrides((current) => {
        const next = new Map(current);
        next.set(rowId, { ...next.get(rowId), ...response.row, mergeStrategy: strategy });
        return next;
      });
    } catch (error) {
      const message = readableActionError(error, "更新数量策略失败");
      setReviewActionError(message);
      toast.error(message);
      refresh();
    }
  }, [isWaitingHuman, localResultRevision, refresh, runWithFreshRevision, selectedTask]);

  const handleStartAddingRow = useCallback((prefillPartNumber?: string) => {
    setIsAddingRow(true);
    if (prefillPartNumber) {
      setNewRowData((prev) => ({ ...prev, customerPartNumber: prefillPartNumber }));
    }
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

  const blockingConflictCount = useMemo(() => {
    const BLOCKING = new Set(["quantity_conflict", "granularity_mismatch", "invalid_date", "uncertain"]);
    return visibleRowEntries.filter(([, row]) => BLOCKING.has(String(row.conflictFlag ?? "none"))).length;
  }, [visibleRowEntries]);

  const reviewFooter = selectedTask && selectedTask.status !== "completed" && selectedTask.status !== "published"
    ? <ReviewFooter step={reviewStep} needsRevalidation={needsRevalidation} hasBlockingConflicts={hasBlockingConflicts} revalidating={isProceedLoading} publishing={isPublishLoading} canPublish={isWaitingHuman && !selectedTaskExcluded && !needsRevalidation && !hasBlockingConflicts} excluded={selectedTaskExcluded} onStepChange={setReviewStep} onRevalidate={handleProceed} onOpenMerge={() => setMergeConfirmOpen(true)} />
    : null;

  return (
    <div className="mail-review-screen screen-fill">
      <header className="mail-review-head">
        <div className="mail-review-statusbar">
          <Link className="mail-review-back" href="/task-workbench" aria-label="返回客户收件箱"><ArrowLeft className="h-4 w-4" /></Link>
          {selectedTask ? <Badge variant="slate">{taskStatusLabel(selectedTask.status, locale)}</Badge> : null}
        </div>
        <ReviewStepper step={reviewStep} onChange={setReviewStep} />
      </header>

      <div className="mail-review-workspace">
        <MailSourcePanel
          locale={locale}
          mail={selectedMail}
          tasks={selectedMailTasks}
          selectedTaskId={selectedTask?.id}
          activeBody={isBodyTextTask}
          activeAttachmentId={selectedAttachment?.attachmentId ?? null}
          taskList={mailTaskList}
          busyTaskId={scopeTaskId}
          onSelectBody={handleSelectBody}
          onSelectAttachment={handleSelectAttachment}
          onSelectTask={handleSelectTask}
          onToggleExcluded={handleToggleExcluded}
        />

        <section className="parse-review-main">
          {isWaitingHuman && (needsRevalidation || hasBlockingConflicts) && (
            <div className="review-warning-banner">
              {needsRevalidation && (
                <div className="review-warning-item review-warning-stale">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>存在未校验的修改</span>
                  <button type="button" className="review-warning-action" onClick={() => { void handleProceed(); }}>
                    {isProceedLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    执行修改
                  </button>
                </div>
              )}
              {hasBlockingConflicts && (
                <div className="review-warning-item review-warning-blocking">
                  <Info className="h-3.5 w-3.5" />
                  <span>{blockingConflictCount} 项冲突待处理</span>
                </div>
              )}
            </div>
          )}
          {!selectedTask ? (
            <div className="panel parse-empty-state">当前邮件没有可审查的解析任务。</div>
          ) : selectedTask.status === "completed" || selectedTask.status === "published" ? (
            <CompletedState />
          ) : reviewStep === 4 ? (
            <MergePreview
              key={selectedTask.id}
              rows={rows}
              rowIds={rowIds}
              getRowValue={getRowValue}
              orderTypeMap={orderTypeMap}
              customerName={selectedMail?.customerName ?? ""}
              customerId={selectedMail?.customerId ?? null}
              customerOptions={mergeCustomerOptions}
              updatedAt={selectedTask.requestedAt || selectedTask.receivedAt}
              preferEditedDate={preferEditedDate}
              footer={reviewFooter}
            />
          ) : (
              <MiddlePanel
                locale={locale}
                actionBar={<ReviewActionBar step={reviewStep} dateOffset={dateOffset} mergeStrategy={mergeStrategy} disabled={!isWaitingHuman || batchLoading || isProceedLoading} loading={batchLoading} needsRevalidation={needsRevalidation} revalidating={isProceedLoading} onDateOffsetChange={setDateOffset} onMergeStrategyChange={setMergeStrategy} onApplyDateOffset={handleApplyDateOffset} onApplyMergeStrategy={handleApplyMergeStrategy} onRevalidate={handleProceed} onReset={() => setResetConfirmOpen(true)} />}
                footer={reviewFooter}
                selectedTask={selectedTask}
                selectedMail={selectedMail}
                selectedAttachment={selectedAttachment}
                isBodyTextTask={isBodyTextTask}
                targetSheetName={previewSheetName}
                parsedSheetNames={parsedSheetNames}
                addingSource={mailTaskLoading}
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
                reviewReason={selectedTask.reviewSummary?.reason ?? null}
                reviewType={selectedTask.reviewSummary?.reviewType ?? null}
                actionError={reviewActionError}
                isProceedLoading={isProceedLoading}
                onProceed={() => { void handleProceed(); }}
                preferEditedDate={preferEditedDate}
                langParam={params.get("lang")}
                getRowValue={getRowValue}
                onToggleMappingSort={toggleMappingSort}
                onBulkToggleOrderType={bulkToggleOrderType}
                onBulkToggleCardOrderType={bulkToggleCardOrderType}
                onStartAddingRow={handleStartAddingRow}
                onToggleOrderType={toggleOrderType}
                onMergeStrategyChange={handleRowMergeStrategy}
                onDeleteRow={handleDeleteRow}
                onStartEditing={startEditing}
                onEditValueChange={setEditValue}
                onCommitEdit={commitEdit}
                onCancelEditing={cancelEditing}
                onRemoveLocalNewRow={handleRemoveLocalNewRow}
                onNewRowFieldChange={handleNewRowFieldChange}
                onSaveNewRow={handleSaveNewRow}
                onCancelNewRow={handleCancelNewRow}
                onAddSheetSource={handleAddPreviewSheet}
              />
          )}
        </section>
      </div>
      <DialogOverlay open={mergeConfirmOpen} onClose={() => setMergeConfirmOpen(false)} className="items-center pt-0">
        <DialogContent className="w-[min(500px,calc(100vw-32px))] rounded-2xl">
          <DialogHeader><DialogTitle>确认合并到 Orders？</DialogTitle><Button variant="ghost" size="icon" aria-label="关闭" onClick={() => setMergeConfirmOpen(false)}><X className="h-4 w-4" /></Button></DialogHeader>
          <DialogBody><div className="merge-confirm-callout">确认后，当前审查结果将写入 Orders。请先核对预览中的物料、日期与数量。</div></DialogBody>
          <div className="merge-confirm-actions"><Button variant="default" size="sm" onClick={() => setMergeConfirmOpen(false)}>取消</Button><Button variant="primary" size="sm" disabled={isPublishLoading} onClick={handlePublish}>{isPublishLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <GitMerge className="h-3.5 w-3.5" />}确认 Merge</Button></div>
        </DialogContent>
      </DialogOverlay>
      <DialogOverlay open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} className="items-center pt-0">
        <DialogContent className="w-[min(500px,calc(100vw-32px))] rounded-2xl">
          <DialogHeader><DialogTitle>恢复原始解析结果？</DialogTitle><Button variant="ghost" size="icon" aria-label="关闭" onClick={() => setResetConfirmOpen(false)}><X className="h-4 w-4" /></Button></DialogHeader>
          <DialogBody><p className="review-reset-copy">此操作将恢复到原始解析结果，所有步骤的修改都将丢失（包括物料核对、日期调整等）。</p></DialogBody>
          <div className="merge-confirm-actions"><Button variant="default" size="sm" onClick={() => setResetConfirmOpen(false)}>取消</Button><Button variant="destructive" size="sm" disabled={isResetLoading} onClick={handleResetReview}>{isResetLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}确认恢复</Button></div>
        </DialogContent>
      </DialogOverlay>
    </div>
  );
}

const REVIEW_STEPS = [
  { id: 1 as const, title: "物料核对" },
  { id: 2 as const, title: "日期语义" },
  { id: 3 as const, title: "数量策略" },
  { id: 4 as const, title: "合并预览" },
];

function ReviewFooter({ step, needsRevalidation, hasBlockingConflicts, revalidating, publishing, canPublish, excluded, onStepChange, onRevalidate, onOpenMerge }: { step: 1 | 2 | 3 | 4; needsRevalidation: boolean; hasBlockingConflicts: boolean; revalidating: boolean; publishing: boolean; canPublish: boolean; excluded: boolean; onStepChange: (step: 1 | 2 | 3 | 4) => void; onRevalidate: () => Promise<boolean>; onOpenMerge: () => void }) {
  const previousLabel = step === 2 ? "返回物料" : step === 3 ? "返回日期" : "返回数量";
  const nextLabel = step === 1 ? "确认物料，继续日期" : step === 2 ? "确认日期，继续数量" : "生成 Orders 预览";
  const handleNext = async () => {
    if (step === 3 && needsRevalidation) {
      if (await onRevalidate()) onStepChange(4);
      return;
    }
    onStepChange((step + 1) as 2 | 3 | 4);
  };
  return (
    <footer className="parse-review-footer">
      <div>{step === 1 || step === 4 ? null : <Button variant="default" size="sm" onClick={() => onStepChange((step - 1) as 1 | 2 | 3)}><ChevronLeft className="h-3.5 w-3.5" />{previousLabel}</Button>}</div>
      {step < 4 ? <Button variant="primary" size="sm" disabled={revalidating} onClick={() => { void handleNext(); }}>{step === 3 && needsRevalidation ? (revalidating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />) : null}{step === 3 && needsRevalidation ? "执行修改，生成预览" : nextLabel}<ChevronRight className="h-3.5 w-3.5" /></Button> : <div className="parse-footer-actions"><Button variant="default" size="sm" onClick={() => onStepChange(3)}><ChevronLeft className="h-3.5 w-3.5" />{previousLabel}</Button>{needsRevalidation ? <Button variant="primary" size="sm" disabled={revalidating} onClick={() => { void onRevalidate(); }}>{revalidating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}执行修改并更新预览</Button> : <Button variant="primary" size="sm" disabled={!canPublish || publishing} title={excluded ? "当前来源已排除，请先重新纳入 Merge 范围" : hasBlockingConflicts ? "存在未解决的冲突" : needsRevalidation ? "请先执行修改" : undefined} onClick={onOpenMerge}><GitMerge className="h-3.5 w-3.5" />确认 Merge</Button>}</div>}
    </footer>
  );
}

function CompletedState() {
  return (
    <section className="panel parse-complete-state">
      <div className="parse-complete-icon"><Check className="h-5 w-5" /></div>
      <h2>解析结果已合并</h2>
      <p>审查后的结果已写入 Orders。</p>
      <div><Link href="/task-workbench"><Button variant="default" size="sm">返回邮件</Button></Link><Link href="/orders"><Button variant="primary" size="sm"><Table2 className="h-3.5 w-3.5" />查看 Orders</Button></Link></div>
    </section>
  );
}

function ReviewStepper({ step, onChange }: { step: 1 | 2 | 3 | 4; onChange: (step: 1 | 2 | 3 | 4) => void }) {
  return (
    <nav className="review-stepper" aria-label="解析确认步骤">
      {REVIEW_STEPS.map((item) => (
        <button key={item.id} type="button" className={`${item.id === step ? "active" : ""}${item.id < step ? " complete" : ""}`} aria-current={item.id === step ? "step" : undefined} onClick={() => onChange(item.id)}>
          <span>{item.id < step ? <Check className="h-3.5 w-3.5" /> : item.id}</span>
          <span><strong>{item.title}</strong></span>
        </button>
      ))}
    </nav>
  );
}

function ReviewActionBar({ step, dateOffset, mergeStrategy, disabled, loading, needsRevalidation, revalidating, onDateOffsetChange, onMergeStrategyChange, onApplyDateOffset, onApplyMergeStrategy, onRevalidate, onReset }: { step: 1 | 2 | 3; dateOffset: string; mergeStrategy: BulkMergeStrategy; disabled: boolean; loading: boolean; needsRevalidation: boolean; revalidating: boolean; onDateOffsetChange: (value: string) => void; onMergeStrategyChange: (value: BulkMergeStrategy) => void; onApplyDateOffset: () => void; onApplyMergeStrategy: () => void; onRevalidate: () => Promise<boolean>; onReset: () => void }) {
  const executeButton = <Button className="review-icon-action" variant="default" size="icon-sm" disabled={disabled || !needsRevalidation} aria-label="执行当前修改" title={needsRevalidation ? "执行当前修改并更新校验结果" : "修改后可继续执行"} onClick={() => { void onRevalidate(); }}>{revalidating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}</Button>;
  const resetButton = <Button className="review-icon-action" variant="default" size="icon-sm" disabled={disabled} aria-label="恢复解析结果" title="恢复解析结果" onClick={onReset}><RotateCcw className="h-3.5 w-3.5" /></Button>;
  if (step === 1) return <div className="review-actionbar"><div><strong>物料核对</strong></div><div className="review-actionbar-actions">{executeButton}{resetButton}</div></div>;
  if (step === 2) return (
    <div className="review-actionbar">
      <div><strong>日期语义</strong></div>
      <div className="review-actionbar-actions"><div className="review-action-controls"><span>到货日期统一提前</span><input value={dateOffset} inputMode="numeric" aria-label="提前天数" onChange={(event) => onDateOffsetChange(event.target.value)} /><span>天，转换为提货日期</span><Button variant="primary" size="sm" disabled={disabled} onClick={onApplyDateOffset}>{loading ? "应用中…" : "应用到全部"}</Button></div>{executeButton}{resetButton}</div>
    </div>
  );
  return (
    <div className="review-actionbar">
      <div><strong>数量策略</strong></div>
      <div className="review-actionbar-actions"><div className="review-action-controls"><span>统一合并策略</span><Select value={mergeStrategy} onValueChange={(value) => onMergeStrategyChange(value as BulkMergeStrategy)}><SelectTrigger className="w-[112px]" aria-label="统一合并策略"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="replace">替换</SelectItem><SelectItem value="increment">增加</SelectItem><SelectItem value="decrement">减少</SelectItem></SelectContent></Select><Button variant="primary" size="sm" disabled={disabled} onClick={onApplyMergeStrategy}>{loading ? "应用中…" : "应用到全部"}</Button></div>{executeButton}{resetButton}</div>
    </div>
  );
}

function readableActionError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (isRevisionConflict(error)) return "数据刚刚发生更新，请再次执行当前操作";
  const raw = error.message;
  const jsonStart = raw.indexOf(" - {");
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(raw.slice(jsonStart + 3)) as { detail?: string | { msg?: string }[] };
      if (typeof body.detail === "string") return body.detail;
      if (Array.isArray(body.detail)) {
        const details = body.detail.map((item) => item.msg).filter(Boolean).join("；");
        if (details) return details;
      }
    } catch {
      // Fall through to the original message when the backend body is not JSON.
    }
  }
  return raw || fallback;
}

function MergePreview({ rows, rowIds, getRowValue, orderTypeMap, customerName, customerId, customerOptions, updatedAt, preferEditedDate, footer }: { rows: Record<string, unknown>[]; rowIds: string[]; getRowValue: (rowId: string, field: string, originalValue: unknown) => unknown; orderTypeMap: Map<string, OrderType>; customerName: string; customerId: string | null; customerOptions: { value: string; label: string }[]; updatedAt: string | null | undefined; preferEditedDate: boolean; footer: ReactNode }) {
  const [materialQuery, setMaterialQuery] = useState("");
  const effectiveDate = (rowId: string, row: Record<string, unknown>) => String(preferEditedDate
    ? getRowValue(rowId, "dateInfo", row.dateInfo) || getRowValue(rowId, "expandedDay", row.expandedDay) || ""
    : getRowValue(rowId, "expandedDay", row.expandedDay) || getRowValue(rowId, "dateInfo", row.dateInfo) || "");
  const allDates = Array.from(new Set(rows.map((row, index) => effectiveDate(rowIds[index], row)).filter(Boolean))).sort();
  const [customerFilter, setCustomerFilter] = useState(customerId || "__all__");
  const [visibleDemandKinds, setVisibleDemandKinds] = useState<DemandKind[]>(["forecast", "firm"]);
  const [timeFrom, setTimeFrom] = useState(allDates[0] ?? "");
  const [timeTo, setTimeTo] = useState(allDates.at(-1) ?? "");
  const dates = allDates.filter((date) => (!timeFrom || date >= timeFrom) && (!timeTo || date <= timeTo));
  const groups = new Map<string, { customerPartNumber: string; internalPartNumber: string; type: string; strategy: BulkMergeStrategy; quantities: Map<string, number> }>();
  rows.forEach((row, index) => {
    const rowId = rowIds[index];
    const customerPartNumber = String(getRowValue(rowId, "customerPartNumber", row.customerPartNumber) ?? "");
    const internalPartNumber = String(getRowValue(rowId, "internalPartNumber", row.internalPartNumber) ?? "—");
    const type = (orderTypeMap.get(rowId) ?? String(row.classification ?? "uncertain")) === "confirmed" ? "Firm" : "Forecast";
    const strategy = String(getRowValue(rowId, "mergeStrategy", row.mergeStrategy) ?? "replace") as BulkMergeStrategy;
    const date = effectiveDate(rowId, row);
    const key = `${customerPartNumber}|${internalPartNumber}|${type}|${strategy}`;
    const group = groups.get(key) ?? { customerPartNumber, internalPartNumber, type, strategy, quantities: new Map<string, number>() };
    group.quantities.set(date, (group.quantities.get(date) ?? 0) + Number(getRowValue(rowId, "quantity", row.quantity) ?? 0));
    groups.set(key, group);
  });
  const visibleGroups = Array.from(groups.entries()).filter(([, group]) => {
    if (customerFilter !== "__all__" && customerFilter !== customerId) return false;
    const query = materialQuery.trim().toLowerCase();
    if (query && !`${group.customerPartNumber} ${group.internalPartNumber}`.toLowerCase().includes(query)) return false;
    const kind: DemandKind = group.type === "Firm" ? "firm" : "forecast";
    return visibleDemandKinds.includes(kind);
  });
  const toggleDemandKind = (kind: DemandKind) => {
    setVisibleDemandKinds((current) => {
      if (current.includes(kind)) return current.length === 1 ? current : current.filter((item) => item !== kind);
      return kind === "forecast" ? ["forecast", ...current] : [...current, "firm"];
    });
  };
  const exportPreview = () => {
    const header = ["Customer", "Customer P/N", "Faurecia P/N", "Updated Time", "Type", "合并策略", ...dates, "Total"];
    const body = visibleGroups.map(([, group]) => [customerName, group.customerPartNumber, group.internalPartNumber, updatedAt ?? "", group.type, strategyLabel(group.strategy), ...dates.map((date) => group.quantities.get(date) ?? ""), dates.reduce((sum, date) => sum + (group.quantities.get(date) ?? 0), 0)]);
    const csv = [header, ...body].map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "orders-merge-preview.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="panel scroll-panel merge-preview-panel">
      <div className="panel-head">
        <h2 className="panel-title"><Table2 className="h-4 w-4" />Sales Forecast Plus 2.0</h2>
        <div className="panel-head-actions">{dates.length ? <Button variant="default" size="sm" disabled>当前窗口：{dates[0]} - {dates.at(-1)}</Button> : null}<Button variant="primary" size="sm" onClick={exportPreview}><Download className="h-3.5 w-3.5" />导出</Button></div>
      </div>
      <div className="panel-body orders-body merge-orders-preview-body">
        <OrdersFilters customerLabel="客户" materialLabel="物料" customerFilter={customerFilter} materialFilter={materialQuery} timeFrom={timeFrom} timeTo={timeTo} visibleDemandKinds={visibleDemandKinds} customerOptions={customerOptions} onCustomerFilterChange={setCustomerFilter} onMaterialFilterChange={setMaterialQuery} onDemandKindToggle={toggleDemandKind} onTimeFromChange={setTimeFrom} onTimeToChange={setTimeTo} />
        <div className="orders-table-fill">
          <div className="scroll-x orders-table-scroll order2-scroll merge-preview-scroll">
            <div className="order2-shell merge-preview-shell">
              <table className="order2-table merge-preview-table" style={{ minWidth: Math.max(980, 650 + dates.length * 108) }}>
                <thead><tr><th>Customer</th><th>Customer P/N</th><th>Faurecia P/N</th><th>Updated Time</th><th>Type</th><th>合并策略</th>{dates.map((date) => <th key={date}>{date}</th>)}<th>Total</th></tr></thead>
                <tbody>{visibleGroups.map(([key, group]) => { const total = dates.reduce((sum, date) => sum + (group.quantities.get(date) ?? 0), 0); return <tr key={key}><td>{customerName || "当前客户"}</td><td>{group.customerPartNumber}</td><td>{group.internalPartNumber}</td><td>{updatedAt ? formatDateTime(updatedAt, "zh-CN") : "—"}</td><td><span className={`orders-lane-badge ${group.type.toLowerCase()}`}>{group.type}</span></td><td>{strategyLabel(group.strategy)}</td>{dates.map((date) => <td key={date} className={group.quantities.has(date) ? `order-quantity-cell ${group.type.toLowerCase()}` : ""}>{group.quantities.has(date) ? group.quantities.get(date)?.toLocaleString() : ""}</td>)}<td><strong>{total.toLocaleString()}</strong></td></tr>; })}</tbody>
              </table>
              {visibleGroups.length === 0 ? <div className="orders-state"><strong>当前筛选条件下没有待合并数据</strong></div> : null}
            </div>
          </div>
        </div>
      </div>
      {footer}
    </section>
  );
}

function shiftIsoDate(value: string, days: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function strategyLabel(strategy: BulkMergeStrategy) {
  if (strategy === "increment") return "增加";
  if (strategy === "decrement") return "减少";
  return "替换";
}

function isRevisionConflict(error: unknown) {
  return error instanceof Error && (
    error.message.includes("Backend request failed: 409")
    || error.message.includes("Result revision conflict")
    || error.message.includes('"error_code":"CONFLICT"')
  );
}
