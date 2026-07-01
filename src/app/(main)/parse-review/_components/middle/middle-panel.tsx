"use client";

import { Badge } from "@/components/ui/badge";
import type { WorkspaceAttachment, WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import { type Locale, copy } from "../../../_components/shared";
import type { EditingCell, LocalNewRow, NewRowData, OrderType } from "../parse-review-types";
import { AttachmentPreview } from "./attachment-preview";
import { ResultTable } from "./result-table";

type MiddlePanelProps = {
  locale: Locale;
  selectedTask: WorkspaceTask | undefined;
  selectedMail: WorkspaceMail | undefined;
  selectedAttachment: WorkspaceAttachment | undefined;
  isBodyTextTask: boolean;
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
  langParam: string | null;
  getRowValue: (rowId: string, field: string, originalValue: unknown) => unknown;
  isFieldStale: (fieldName: string) => boolean;
  onToggleMappingSort: () => void;
  onBulkToggleOrderType: () => void;
  onStartAddingRow: () => void;
  onToggleOrderType: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onStartEditing: (rowId: string, field: string, currentValue: unknown) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEditing: () => void;
  onRemoveLocalNewRow: (rowId: string) => void;
  onNewRowFieldChange: (field: keyof NewRowData, value: string) => void;
  onSaveNewRow: () => void;
  onCancelNewRow: () => void;
};

export function MiddlePanel({
  locale,
  selectedTask,
  selectedMail,
  selectedAttachment,
  isBodyTextTask,
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
  langParam,
  getRowValue,
  isFieldStale,
  onToggleMappingSort,
  onBulkToggleOrderType,
  onStartAddingRow,
  onToggleOrderType,
  onDeleteRow,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEditing,
  onRemoveLocalNewRow,
  onNewRowFieldChange,
  onSaveNewRow,
  onCancelNewRow,
}: MiddlePanelProps) {
  const t = copy[locale];

  return (
    <section className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title truncate" title={isBodyTextTask ? "Email Body" : selectedAttachment?.fileName}>
          {isBodyTextTask ? "Email Body" : (selectedAttachment?.fileName ?? t.attachmentPreview)}
        </h2>
        <Badge variant="slate">{t.readonly}</Badge>
      </div>
      <div className="panel-body stack">
        <AttachmentPreview
          locale={locale}
          isBodyTextTask={isBodyTextTask}
          selectedMail={selectedMail}
          selectedAttachment={selectedAttachment}
        />
        <ResultTable
          selectedTask={selectedTask}
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
          langParam={langParam}
          getRowValue={getRowValue}
          isFieldStale={isFieldStale}
          onToggleMappingSort={onToggleMappingSort}
          onBulkToggleOrderType={onBulkToggleOrderType}
          onStartAddingRow={onStartAddingRow}
          onToggleOrderType={onToggleOrderType}
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
    </section>
  );
}
