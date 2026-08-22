"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BACKEND_URL } from "@/api/client";
import type { MailTaskSummary, WorkspaceMail } from "@/types/models/inbox";
import type { WorkspaceTask } from "@/types/models/inbox";
import type { TaskStaleState } from "@/types/models/tasks";
import type { Locale } from "../../../_components/shared";
import { copy } from "../../../_components/shared";
import { ExcelViewer, PdfViewer } from "../../../_components/shared-components";
import { ResultTable } from "../../../parse-review/_components/middle/result-table";
import type { EditingCell, LocalNewRow, NewRowData, OrderType } from "../../../parse-review/_components/parse-review-types";
import { addRow as addRowApi, deleteRow as deleteRowApi, getEffectiveRows, parseSheet as parseSheetApi, patchRow, proceedTask } from "@/services/tasks";
import type { TabItem } from "../mail-workbench-page";

type Props = {
  tab: TabItem;
  mail: WorkspaceMail | null;
  tasks: MailTaskSummary[];
  locale: Locale;
  onRefreshTasks: () => void;
  onActiveTaskChange?: (task: MailTaskSummary | null) => void;
  onPipelineState?: (state: { isProceedLoading: boolean; canProceed: boolean; taskStaleState: TaskStaleState; onProceed: () => void }) => void;
};

export function ParseReviewTab({
  tab,
  mail,
  tasks,
  locale,
  onRefreshTasks,
  onActiveTaskChange,
  onPipelineState,
}: Props) {
  const t = copy[locale];

  // --- Active sheet tracking (for multi-sheet Excel) ---
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [defaultSheet, setDefaultSheet] = useState<string | null>(null);

  const handleSheetChange = useCallback((sheetName: string) => {
    setActiveSheet(sheetName);
    setDefaultSheet((prev) => prev ?? sheetName);
  }, []);

  const currentTask = useMemo(() => {
    if (tab.type === "body") return tasks.find((t) => t.attachmentId === null) ?? null;
    if (tab.attachmentId) {
      const attachmentTasks = tasks.filter((t) => t.attachmentId === tab.attachmentId);
      if (activeSheet) {
        // Exact match for explicitly-targeted sheet task
        const sheetTask = attachmentTasks.find((t) => t.targetSheetName === activeSheet);
        if (sheetTask) return sheetTask;
        // If viewing the default (initial) sheet, use the null-target task
        if (activeSheet === defaultSheet) {
          const defaultTask = attachmentTasks.find((t) => !t.targetSheetName);
          if (defaultTask) return defaultTask;
        }
        // No task for this specific sheet
        return null;
      }
      if (tab.taskId) {
        const explicit = attachmentTasks.find((t) => t.id === tab.taskId);
        if (explicit) return explicit;
      }
      return attachmentTasks.find((t) => !t.targetSheetName) ?? attachmentTasks[0] ?? null;
    }
    if (tab.taskId) return tasks.find((t) => t.id === tab.taskId) ?? null;
    return null;
  }, [tab, tasks, activeSheet, defaultSheet]);

  const attachment = useMemo(() => {
    if (!mail || !tab.attachmentId) return null;
    return mail.attachments.find((a) => a.attachmentId === tab.attachmentId) ?? null;
  }, [mail, tab.attachmentId]);

  // --- Internal row fetching (driven by currentTask) ---
  const [rows, setRows] = useState<Record<string, Record<string, unknown>>>({});
  const [resultRevision, setResultRevision] = useState(1);
  const [taskStaleState, setTaskStaleState] = useState<TaskStaleState>({ pendingReevalSteps: [], staleFieldNames: [] });
  const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const fetchedTaskIdRef = useRef<string | null>(null);

  const loadRows = useCallback(async () => {
    const taskId = currentTask?.id ?? null;
    if (!taskId) {
      setRows({});
      setResultRevision(1);
      setTaskStaleState({ pendingReevalSteps: [], staleFieldNames: [] });
      setDeletedRowIds([]);
      return;
    }
    if (fetchedTaskIdRef.current !== taskId) setRowsLoading(true);
    try {
      const result = await getEffectiveRows(taskId);
      setRows(result.rows);
      setResultRevision(result.resultRevision);
      setTaskStaleState(result.taskStaleState);
      setDeletedRowIds(result.deletedRowIds);
      fetchedTaskIdRef.current = taskId;
    } catch {
      // keep previous
    } finally {
      setRowsLoading(false);
    }
  }, [currentTask?.id]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  // Reset local editing state when the active task changes (e.g. sheet switch)
  const prevTaskIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (prevTaskIdRef.current === undefined) {
      prevTaskIdRef.current = currentTask?.id ?? null;
      return;
    }
    if ((currentTask?.id ?? null) !== prevTaskIdRef.current) {
      prevTaskIdRef.current = currentTask?.id ?? null;
      setOrderTypeMap(new Map());
      setLocalRowOverrides(new Map());
      setLocalDeletedRowIds(new Set());
      setLocalNewRows([]);
      setEditingCell(null);
      setEditValue("");
      setIsAddingRow(false);
      setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
      setNewRowErrors({});
    }
  }, [currentTask?.id]);

  // Notify parent of active task changes (for PipelineBar sync)
  useEffect(() => {
    onActiveTaskChange?.(currentTask);
  }, [currentTask, onActiveTaskChange]);

  const taskAsWorkspaceTask: WorkspaceTask | undefined = useMemo(() => {
    if (!currentTask) return undefined;
    return {
      id: currentTask.id,
      mailMessageId: "",
      attachmentId: currentTask.attachmentId,
      targetSheetName: currentTask.targetSheetName,
      taskType: currentTask.taskType,
      status: currentTask.status,
      pipelineStep: currentTask.pipelineStep,
      warnings: currentTask.warnings,
      traceSteps: currentTask.traceSteps,
      resultRows: rows,
      resultRevision: currentTask.resultRevision,
      reviewSummary: currentTask.reviewSummary,
      customerId: currentTask.customerId,
      customerName: currentTask.customerName,
      requestedAt: currentTask.requestedAt,
      completedAt: currentTask.completedAt,
    };
  }, [currentTask, rows]);

  const isWaitingHuman = currentTask?.status === "waiting_human_decision";
  const isTaskProcessing = currentTask != null && !["waiting_human_decision", "completed", "failed", "cancelled"].includes(currentTask.status);

  // Poll for task completion when processing
  useEffect(() => {
    if (!isTaskProcessing) return;
    const interval = setInterval(() => {
      onRefreshTasks();
      loadRows();
    }, 3000);
    return () => clearInterval(interval);
  }, [isTaskProcessing, onRefreshTasks, loadRows]);

  // --- ResultTable state ---
  const [orderTypeMap, setOrderTypeMap] = useState<Map<string, OrderType>>(new Map());
  const [mappingSortOrder, setMappingSortOrder] = useState<"asc" | "desc" | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");
  const [localRowOverrides, setLocalRowOverrides] = useState<Map<string, Record<string, unknown>>>(new Map());
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowData, setNewRowData] = useState<NewRowData>({ customerPartNumber: "", quantity: "", dateInfo: "" });
  const [newRowErrors, setNewRowErrors] = useState<Record<string, string>>({});
  const [localNewRows, setLocalNewRows] = useState<LocalNewRow[]>([]);
  const [localDeletedRowIds, setLocalDeletedRowIds] = useState<Set<string>>(new Set());
  const [parsingSheet, setParsingSheet] = useState(false);
  const [isProceedLoading, setIsProceedLoading] = useState(false);

  const handleParseSheet = useCallback(async (sheetName: string) => {
    const taskForParse = currentTask ?? tasks.find((t) => t.attachmentId === tab.attachmentId) ?? null;
    if (!taskForParse) return;
    setParsingSheet(true);
    try {
      await parseSheetApi(taskForParse.id, sheetName);
      await onRefreshTasks();
    } catch (err) {
      console.error("[ParseReviewTab] parseSheet failed:", err);
    } finally {
      setParsingSheet(false);
    }
  }, [currentTask, tasks, tab.attachmentId, onRefreshTasks]);

  const handleProceed = useCallback(async () => {
    if (!currentTask) return;
    setIsProceedLoading(true);
    try {
      const overrides: Record<string, string> = {};
      for (const [rowId, classification] of orderTypeMap) {
        if (classification === "confirmed" || classification === "forecast") {
          overrides[rowId] = classification;
        }
      }
      const deleted = localDeletedRowIds.size > 0 ? Array.from(localDeletedRowIds) : undefined;
      const added = localNewRows.length > 0
        ? localNewRows.map((r) => ({ customer_part_number: r.customerPartNumber, quantity: r.quantity, date_info: r.dateInfo, date_format: r.dateFormat }))
        : undefined;
      await proceedTask(currentTask.id, resultRevision, overrides, deleted, added);
      setLocalRowOverrides(new Map());
      setLocalDeletedRowIds(new Set());
      setLocalNewRows([]);
      setOrderTypeMap(new Map());
      loadRows();
      onRefreshTasks();
    } catch (err) {
      console.error("[ParseReviewTab] proceed failed:", err);
    } finally {
      setIsProceedLoading(false);
    }
  }, [currentTask, resultRevision, orderTypeMap, localDeletedRowIds, localNewRows, loadRows, onRefreshTasks]);

  // Notify parent of pipeline action state (for proceed button in PipelineBar)
  const handleProceedRef = useRef<() => void>(() => {});
  handleProceedRef.current = handleProceed;
  useEffect(() => {
    onPipelineState?.({
      isProceedLoading,
      canProceed: isWaitingHuman,
      taskStaleState,
      onProceed: () => handleProceedRef.current(),
    });
  }, [isProceedLoading, isWaitingHuman, taskStaleState, onPipelineState]);

  const rowEntries = useMemo(() => {
    return Object.entries(rows).filter(([id]) => !deletedRowIds.includes(id) && !localDeletedRowIds.has(id));
  }, [rows, deletedRowIds, localDeletedRowIds]);

  const visibleRowEntries = rowEntries;
  const displayRowEntries = useMemo(() => {
    if (!mappingSortOrder) return visibleRowEntries;
    return [...visibleRowEntries].sort(([, a], [, b]) => {
      const aUnmapped = String(a.mappingStatus ?? "") === "unmapped" ? 0 : 1;
      const bUnmapped = String(b.mappingStatus ?? "") === "unmapped" ? 0 : 1;
      return mappingSortOrder === "asc" ? aUnmapped - bUnmapped : bUnmapped - aUnmapped;
    });
  }, [visibleRowEntries, mappingSortOrder]);

  const tableRows = useMemo(() => displayRowEntries.map(([, v]) => v), [displayRowEntries]);
  const tableRowIds = useMemo(() => displayRowEntries.map(([k]) => k), [displayRowEntries]);

  const conflictColorMap = useMemo(() => {
    const GRANULARITY_COLORS = ["conflict-group-orange", "conflict-group-purple", "conflict-group-teal", "conflict-group-pink"];
    const QUANTITY_COLORS = ["conflict-group-red", "conflict-group-crimson", "conflict-group-rose", "conflict-group-brick"];
    const partGroups: Record<string, string[]> = {};
    for (const [rowId, row] of rowEntries) {
      const conflict = String(row.conflictFlag ?? "none");
      if (conflict === "granularity_mismatch" || conflict === "quantity_conflict") {
        const pn = String(row.customerPartNumber ?? "");
        const key = `${conflict}::${pn}`;
        if (!partGroups[key]) partGroups[key] = [];
        partGroups[key].push(rowId);
      }
    }
    const result = new Map<string, string>();
    let gIdx = 0, qIdx = 0;
    for (const [key, _ids] of Object.entries(partGroups)) {
      const isGranularity = key.startsWith("granularity_mismatch");
      const color = isGranularity ? GRANULARITY_COLORS[gIdx++ % GRANULARITY_COLORS.length] : QUANTITY_COLORS[qIdx++ % QUANTITY_COLORS.length];
      result.set(key, color);
    }
    return result;
  }, [rowEntries]);

  const bulkOrderState = useMemo(() => {
    const vals = Array.from(orderTypeMap.values());
    if (vals.length > 0 && vals.every((v) => v === "confirmed")) return "firm" as const;
    if (vals.length > 0 && vals.every((v) => v === "forecast")) return "forecast" as const;
    return "mixed" as const;
  }, [orderTypeMap]);

  const getRowValue = useCallback((rowId: string, field: string, originalValue: unknown) => {
    const override = localRowOverrides.get(rowId);
    if (override && field in override) return override[field];
    return originalValue;
  }, [localRowOverrides]);

  const isFieldStale = useCallback((fieldName: string) => {
    return taskStaleState.staleFieldNames.includes(fieldName);
  }, [taskStaleState]);

  const toggleMappingSort = useCallback(() => {
    setMappingSortOrder((prev) => (prev === null ? "asc" : prev === "asc" ? "desc" : null));
  }, []);

  const bulkToggleOrderType = useCallback(() => {
    setOrderTypeMap((prev) => {
      const next = new Map(prev);
      const target: OrderType = bulkOrderState === "firm" ? "forecast" : "confirmed";
      for (const rowId of tableRowIds) {
        next.set(rowId, target);
      }
      return next;
    });
  }, [bulkOrderState, tableRowIds]);

  const toggleOrderType = useCallback((rowId: string) => {
    setOrderTypeMap((prev) => {
      const next = new Map(prev);
      const current = next.get(rowId) ?? "uncertain";
      next.set(rowId, current === "confirmed" ? "forecast" : "confirmed");
      return next;
    });
  }, []);

  const handleDeleteRow = useCallback(async (rowId: string) => {
    if (!currentTask) return;
    setLocalDeletedRowIds((prev) => new Set(prev).add(rowId));
    try {
      await deleteRowApi(currentTask.id, rowId, resultRevision);
      loadRows();
    } catch {
      setLocalDeletedRowIds((prev) => { const n = new Set(prev); n.delete(rowId); return n; });
    }
  }, [currentTask, resultRevision, loadRows]);

  const startEditing = useCallback((rowId: string, field: string, currentValue: unknown) => {
    setEditingCell({ rowId, field });
    setEditValue(String(currentValue ?? ""));
  }, []);

  const commitEdit = useCallback(async () => {
    if (!editingCell || !currentTask) return;
    const { rowId, field } = editingCell;
    setLocalRowOverrides((prev) => {
      const next = new Map(prev);
      const row = next.get(rowId) ?? {};
      next.set(rowId, { ...row, [field]: editValue });
      return next;
    });
    setEditingCell(null);
    try {
      await patchRow(currentTask.id, rowId, resultRevision, { [field]: editValue });
      loadRows();
    } catch {
      // keep local override as fallback
    }
  }, [editingCell, editValue, currentTask, resultRevision, loadRows]);

  const cancelEditing = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
  }, []);

  const handleStartAddingRow = useCallback(() => {
    setIsAddingRow(true);
  }, []);

  const handleNewRowFieldChange = useCallback((field: keyof NewRowData, value: string) => {
    setNewRowData((prev) => ({ ...prev, [field]: value }));
    setNewRowErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  }, []);

  const handleSaveNewRow = useCallback(async () => {
    if (!currentTask) return;
    const errors: Record<string, string> = {};
    if (!newRowData.customerPartNumber.trim()) errors.customerPartNumber = "Required";
    if (!newRowData.quantity.trim()) errors.quantity = "Required";
    if (!newRowData.dateInfo.trim()) errors.dateInfo = "Required";
    if (Object.keys(errors).length > 0) { setNewRowErrors(errors); return; }

    try {
      await addRowApi(currentTask.id, resultRevision, newRowData.customerPartNumber.trim(), Number(newRowData.quantity) || null, newRowData.dateInfo.trim());
      setIsAddingRow(false);
      setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
      setNewRowErrors({});
      loadRows();
    } catch (err) {
      console.error("[ParseReviewTab] addRow failed:", err);
      setLocalNewRows((prev) => [...prev, {
        id: `local-${Date.now()}`,
        customerPartNumber: newRowData.customerPartNumber.trim(),
        quantity: Number(newRowData.quantity) || 0,
        dateInfo: newRowData.dateInfo.trim(),
        dateFormat: "day" as const,
      }]);
      setIsAddingRow(false);
      setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
      setNewRowErrors({});
    }
  }, [currentTask, newRowData, resultRevision, loadRows]);

  const handleCancelNewRow = useCallback(() => {
    setIsAddingRow(false);
    setNewRowData({ customerPartNumber: "", quantity: "", dateInfo: "" });
    setNewRowErrors({});
  }, []);

  const handleRemoveLocalNewRow = useCallback((rowId: string) => {
    setLocalNewRows((prev) => prev.filter((r) => r.id !== rowId));
  }, []);

  return (
    <div className="parse-review-content">
      {/* Preview section */}
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "auto", background: "var(--panel)" }}>
        {tab.type === "body" && mail ? (
          <div style={{ whiteSpace: "pre-line", padding: 16, fontSize: 13, lineHeight: 1.7, color: "var(--ink-soft)" }}>
            {normalizeMailBody(mail.bodyText)}
            <MailImages mail={mail} />
          </div>
        ) : attachment?.fileArtifactId ? (
          isExcelFile(attachment.fileName) ? (
            <ExcelViewer fileArtifactId={attachment.fileArtifactId} locale={locale} onParseSheet={handleParseSheet} parsingSheet={parsingSheet} onSheetChange={handleSheetChange} />
          ) : (
            <PdfViewer fileArtifactId={attachment.fileArtifactId} locale={locale} />
          )
        ) : (
          <p style={{ padding: 16, fontSize: 12, color: "var(--muted)" }}>{t.noAttachment}</p>
        )}
      </div>

      {/* Result table section — full featured */}
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, background: "var(--panel)", display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", flexShrink: 0 }}>
          <span>
            {locale === "en" ? "Parse Results" : "解析结果"}
            {currentTask && (
              <span style={{ marginLeft: 8, fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
                rev {resultRevision} · {rowEntries.length} rows
              </span>
            )}
          </span>
          {isWaitingHuman && !isAddingRow && (
            <button
              type="button"
              onClick={handleStartAddingRow}
              style={{
                marginLeft: "auto",
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                border: "1px solid var(--forvia-blue)",
                borderRadius: 6,
                background: "var(--forvia-blue)",
                color: "white",
                cursor: "pointer",
              }}
            >
              + {locale === "en" ? "Add Row" : "添加行"}
            </button>
          )}
        </div>
        {/* Scrollable result body */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {rowsLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
              Loading...
            </div>
          ) : isTaskProcessing ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ display: "inline-block", width: 20, height: 20, border: "2px solid var(--line)", borderTopColor: "var(--forvia-blue)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <p style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
                {locale === "en" ? "Parsing in progress..." : "正在解析中..."}
              </p>
              <p style={{ marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
                {locale === "en"
                  ? `Task status: ${currentTask?.status ?? "unknown"}`
                  : `任务状态: ${currentTask?.status ?? "未知"}`}
              </p>
            </div>
          ) : isAddingRow && rowEntries.length === 0 && localNewRows.length === 0 ? (
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Customer P/N *</label>
                  <input
                    style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: `1px solid ${newRowErrors.customerPartNumber ? "var(--danger)" : "var(--line)"}`, borderRadius: 6 }}
                    value={newRowData.customerPartNumber}
                    onChange={(e) => handleNewRowFieldChange("customerPartNumber", e.target.value)}
                    placeholder="Customer P/N"
                    autoFocus
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Quantity *</label>
                  <input
                    style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: `1px solid ${newRowErrors.quantity ? "var(--danger)" : "var(--line)"}`, borderRadius: 6 }}
                    type="number"
                    value={newRowData.quantity}
                    onChange={(e) => handleNewRowFieldChange("quantity", e.target.value)}
                    placeholder="Qty"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Date *</label>
                  <input
                    style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: `1px solid ${newRowErrors.dateInfo ? "var(--danger)" : "var(--line)"}`, borderRadius: 6 }}
                    value={newRowData.dateInfo}
                    onChange={(e) => handleNewRowFieldChange("dateInfo", e.target.value)}
                    placeholder="Date info"
                  />
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    type="button"
                    onClick={handleSaveNewRow}
                    style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, border: "none", borderRadius: 6, background: "var(--forvia-blue)", color: "white", cursor: "pointer" }}
                  >
                    {locale === "en" ? "Save" : "保存"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelNewRow}
                    style={{ padding: "6px 12px", fontSize: 11, fontWeight: 700, border: "1px solid var(--line)", borderRadius: 6, background: "white", color: "var(--ink-soft)", cursor: "pointer" }}
                  >
                    {locale === "en" ? "Cancel" : "取消"}
                  </button>
                </div>
              </div>
              {Object.keys(newRowErrors).length > 0 && (
                <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 6 }}>
                  {locale === "en" ? "Please fill required fields" : "请填写必填项"}
                </p>
              )}
            </div>
          ) : (
            <ResultTable
              selectedTask={taskAsWorkspaceTask}
              rows={tableRows}
              rowIds={tableRowIds}
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
              langParam={locale === "en" ? "en" : null}
              getRowValue={getRowValue}
              isFieldStale={isFieldStale}
              onToggleMappingSort={toggleMappingSort}
              onBulkToggleOrderType={bulkToggleOrderType}
              onStartAddingRow={handleStartAddingRow}
              onToggleOrderType={toggleOrderType}
              onDeleteRow={handleDeleteRow}
              onStartEditing={startEditing}
              onEditValueChange={setEditValue}
              onCommitEdit={commitEdit}
              onCancelEditing={cancelEditing}
              onRemoveLocalNewRow={handleRemoveLocalNewRow}
              onNewRowFieldChange={handleNewRowFieldChange}
              onSaveNewRow={handleSaveNewRow}
              onCancelNewRow={handleCancelNewRow}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeMailBody(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^[^\S\n]+$/gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xlsm") || lower.endsWith(".xls");
}

function MailImages({ mail }: { mail: WorkspaceMail }) {
  const seenIds = new Set<string>();
  const allImages: { key: string; artifactId: string; alt: string }[] = [];

  for (const image of mail.inlineImages ?? []) {
    if (!seenIds.has(image.fileArtifactId)) {
      seenIds.add(image.fileArtifactId);
      allImages.push({ key: image.imageId, artifactId: image.fileArtifactId, alt: "inline" });
    }
  }

  for (const attachment of mail.attachments) {
    if (attachment.contentType?.startsWith("image/") && attachment.fileArtifactId && !seenIds.has(attachment.fileArtifactId)) {
      seenIds.add(attachment.fileArtifactId);
      allImages.push({ key: attachment.attachmentId, artifactId: attachment.fileArtifactId, alt: attachment.fileName });
    }
  }

  if (allImages.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {allImages.map((image) => (
        <img
          key={image.key}
          src={`${BACKEND_URL}/api/files/${image.artifactId}/content`}
          alt={image.alt}
          style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4, alignSelf: "flex-start" }}
        />
      ))}
    </div>
  );
}
