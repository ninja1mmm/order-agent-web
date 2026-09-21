"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle, FileSearch, LoaderCircle, PanelRightClose, PanelRightOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WorkspaceAttachment, WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import { type Locale, copy } from "../../../_components/shared";
import type { EditingCell, LocalNewRow, NewRowData, OrderType } from "../parse-review-types";
import { AttachmentPreview } from "./attachment-preview";
import { buildConflictReviewSummary } from "./conflict-review-summary";
import { ResultTable } from "./result-table";

type MiddlePanelProps = {
  locale: Locale;
  actionBar: ReactNode;
  footer: ReactNode;
  readOnly: boolean;
  selectedTask: WorkspaceTask | undefined;
  selectedMail: WorkspaceMail | undefined;
  selectedAttachment: WorkspaceAttachment | undefined;
  isBodyTextTask: boolean;
  targetSheetName: string | null | undefined;
  parsedSheetNames: string[];
  addingSource: boolean;
  rows: Record<string, unknown>[];
  rowIds: string[];
  orderTypeMap: Map<string, OrderType>;
  bulkOrderState: "firm" | "forecast" | "mixed";
  mappingSortOrder: "asc" | "desc" | null;
  conflictColorMap: Map<string, string>;
  isWaitingHuman: boolean;
  isAddingRow: boolean;
  editingCell: EditingCell;
  editValue: string;
  localNewRows: LocalNewRow[];
  newRowData: NewRowData;
  newRowErrors: Record<string, string>;
  reviewReason: string | null;
  reviewType: string | null;
  actionError: string | null;
  isProceedLoading: boolean;
  onProceed: () => void;
  preferEditedDate: boolean;
  langParam: string | null;
  getRowValue: (rowId: string, field: string, originalValue: unknown) => unknown;
  onToggleMappingSort: () => void;
  onBulkToggleOrderType: () => void;
  onBulkToggleCardOrderType: (cardRowIds: string[]) => void;
  onStartAddingRow: (prefillPartNumber?: string) => void;
  onToggleOrderType: (rowId: string) => void;
  onMergeStrategyChange: (rowId: string, strategy: "replace" | "increment" | "decrement") => void;
  onDeleteRow: (rowId: string) => void;
  onStartEditing: (rowId: string, field: string, currentValue: unknown) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEditing: () => void;
  onRemoveLocalNewRow: (rowId: string) => void;
  onNewRowFieldChange: (field: keyof NewRowData, value: string) => void;
  onSaveNewRow: () => void;
  onCancelNewRow: () => void;
  onAddSheetSource: (sheetName: string) => void;
};

export function MiddlePanel({
  locale,
  actionBar,
  footer,
  readOnly,
  selectedTask,
  selectedMail,
  selectedAttachment,
  isBodyTextTask,
  targetSheetName,
  parsedSheetNames,
  addingSource,
  rows,
  rowIds,
  orderTypeMap,
  bulkOrderState,
  mappingSortOrder,
  conflictColorMap,
  isWaitingHuman,
  isAddingRow,
  editingCell,
  editValue,
  localNewRows,
  newRowData,
  newRowErrors,
  reviewReason,
  reviewType,
  actionError,
  isProceedLoading,
  onProceed,
  preferEditedDate,
  langParam,
  getRowValue,
  onToggleMappingSort,
  onBulkToggleOrderType,
  onBulkToggleCardOrderType,
  onStartAddingRow,
  onToggleOrderType,
  onMergeStrategyChange,
  onDeleteRow,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEditing,
  onRemoveLocalNewRow,
  onNewRowFieldChange,
  onSaveNewRow,
  onCancelNewRow,
  onAddSheetSource,
}: MiddlePanelProps) {
  const t = copy[locale];
  const [resultCollapsed, setResultCollapsed] = useState(false);
  const conflictReviewSummary = reviewType === "extraction_review"
    ? buildConflictReviewSummary(rows)
    : null;
  const displayedReviewReason = conflictReviewSummary?.message ?? reviewReason;
  const displayedReviewTitle = conflictReviewSummary?.title ?? "需要人工确认";

  return (
    <div className={`parse-horizontal-workspace${resultCollapsed ? " result-collapsed" : ""}`}>
      <section className="panel scroll-panel source-preview-panel">
        <div className="panel-head">
          <div className="source-preview-title"><FileSearch className="h-4 w-4" /><span><Tooltip><TooltipTrigger asChild><strong tabIndex={0}>{isBodyTextTask ? "Email Body" : (selectedAttachment?.fileName ?? t.attachmentPreview)}</strong></TooltipTrigger><TooltipContent>{isBodyTextTask ? "Email Body" : (selectedAttachment?.fileName ?? t.attachmentPreview)}</TooltipContent></Tooltip></span></div>
        </div>
        <div className="panel-body source-preview-body"><AttachmentPreview locale={locale} isBodyTextTask={isBodyTextTask} selectedMail={selectedMail} selectedAttachment={selectedAttachment} targetSheetName={targetSheetName} parsedSheetNames={parsedSheetNames} addingSource={addingSource} readOnly={readOnly} onAddSheetSource={onAddSheetSource} /></div>
      </section>
      <section className="panel scroll-panel parse-edit-panel">
        <div className="parse-result-toolbar">
          {resultCollapsed ? null : actionBar}
          <Tooltip><TooltipTrigger asChild><Button className={`parse-collapse-button${resultCollapsed ? " is-collapsed" : ""}`} variant="default" size="icon-sm" aria-label={resultCollapsed ? "展开解析" : "收起解析"} onClick={() => setResultCollapsed((value) => !value)}>{resultCollapsed ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}</Button></TooltipTrigger><TooltipContent>{resultCollapsed ? "展开解析" : "收起解析"}</TooltipContent></Tooltip>
        </div>
        {!resultCollapsed ? <div className="parse-result-body">
          {actionError ? (
            <div className="review-feedback error" role="alert">
              <AlertTriangle className="h-4 w-4" />
              <div><strong>操作未完成</strong><span>{actionError}</span></div>
            </div>
          ) : null}
          {displayedReviewReason ? (
            reviewType === "confirmation_required" ? (
              <div className="review-feedback info">
                <CheckCircle className="h-4 w-4" />
                <div><strong>解析完成，请确认</strong><span>{displayedReviewReason}</span></div>
              </div>
            ) : (
              <div className="review-feedback warning">
                <AlertTriangle className="h-4 w-4" />
                <div><strong>{displayedReviewTitle}</strong><span>{displayedReviewReason}</span></div>
                {isWaitingHuman && (
                  <button type="button" className="review-feedback-action" disabled={isProceedLoading} onClick={onProceed}>
                    {isProceedLoading ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    重新校验
                  </button>
                )}
              </div>
            )
          ) : null}
          <div className="scroll-x">
          <ResultTable
          selectedTask={selectedTask}
          rows={rows}
          rowIds={rowIds}
          orderTypeMap={orderTypeMap}
          bulkOrderState={bulkOrderState}
          mappingSortOrder={mappingSortOrder}
          conflictColorMap={conflictColorMap}
          isWaitingHuman={isWaitingHuman}
          readOnly={readOnly}
          isAddingRow={isAddingRow}
          editingCell={editingCell}
          editValue={editValue}
          localNewRows={localNewRows}
          newRowData={newRowData}
          newRowErrors={newRowErrors}
          preferEditedDate={preferEditedDate}
          langParam={langParam}
          getRowValue={getRowValue}
          onToggleMappingSort={onToggleMappingSort}
          onBulkToggleOrderType={onBulkToggleOrderType}
          onBulkToggleCardOrderType={onBulkToggleCardOrderType}
          onStartAddingRow={onStartAddingRow}
          onToggleOrderType={onToggleOrderType}
          onMergeStrategyChange={onMergeStrategyChange}
          onDeleteRow={onDeleteRow}
          onStartEditing={onStartEditing}
          onEditValueChange={onEditValueChange}
          onCommitEdit={onCommitEdit}
          onCancelEditing={onCancelEditing}
          onRemoveLocalNewRow={onRemoveLocalNewRow}
          onNewRowFieldChange={onNewRowFieldChange}
          onSaveNewRow={onSaveNewRow}
          onCancelNewRow={onCancelNewRow}
        />
        </div>
        </div> : null}
        {resultCollapsed ? null : footer}
      </section>
    </div>
  );
}
