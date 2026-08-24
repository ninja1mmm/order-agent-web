"use client";

import { Plus } from "lucide-react";
import type { WorkspaceTask } from "@/services/inbox";
import type { EditingCell, LocalNewRow, NewRowData, OrderType } from "../parse-review-types";
import { AddResultRow } from "./add-result-row";
import { ExistingResultRow } from "./existing-result-row";
import { LocalNewResultRow } from "./local-new-result-row";

type ResultTableProps = {
  selectedTask: WorkspaceTask | undefined;
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
  preferEditedDate: boolean;
  langParam: string | null;
  getRowValue: (rowId: string, field: string, originalValue: unknown) => unknown;
  onToggleMappingSort: () => void;
  onBulkToggleOrderType: () => void;
  onStartAddingRow: () => void;
  onToggleOrderType: (rowId: string) => void;
  onMergeStrategyChange?: (rowId: string, strategy: "replace" | "increment" | "decrement") => void;
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

export function ResultTable({
  selectedTask,
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
  preferEditedDate,
  langParam,
  getRowValue,
  onToggleMappingSort,
  onBulkToggleOrderType,
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
}: ResultTableProps) {
  if (rows.length === 0 && localNewRows.length === 0 && !isAddingRow) {
    if (!isWaitingHuman) return null;
    return (
      <div className="scroll-x">
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ marginBottom: 12 }}>未提取到数据，可手动添加行</p>
          <button type="button" className="proceed-btn" onClick={onStartAddingRow}>
            <Plus className="h-3 w-3" />
            添加行
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-x">
      <table className="table">
        <thead>
          <tr>
            <th>Customer P/N{isWaitingHuman && <span className="th-edit-tag">可编辑</span>}</th>
            <th>Faurecia P/N</th>
            <th>Quantity{isWaitingHuman && <span className="th-edit-tag">可编辑</span>}</th>
            <th>Collection Date{isWaitingHuman && <span className="th-edit-tag">可编辑</span>}</th>
            <th>Week</th>
            <th
              style={{ cursor: "pointer", userSelect: "none" }}
              title="点击按映射状态排序"
              onClick={onToggleMappingSort}
            >
              Mapping{mappingSortOrder === "asc" ? " ▲" : mappingSortOrder === "desc" ? " ▼" : ""}
            </th>
            <th className="order-type-header">
              <button type="button" className={`order-type-bulk-pill ${bulkOrderState}`} title="切换全部 Firm / Forecast" onClick={onBulkToggleOrderType}>
                {bulkOrderState === "firm" ? "Firm" : bulkOrderState === "forecast" ? "Forecast" : "Firm / Forecast"}
              </button>
            </th>
            <th>合并策略</th>
            <th>Conflict</th>
            <th style={{ width: 36 }}>
              {isWaitingHuman && !isAddingRow && (
                <button
                  type="button"
                  className="row-add-btn"
                  title="新增行"
                  onClick={onStartAddingRow}
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = rowIds[index];
            return (
              <ExistingResultRow
                key={rowId}
                row={row}
                rowId={rowId}
                selectedTask={selectedTask}
                orderType={orderTypeMap.get(rowId) ?? "uncertain"}
                conflictClass={conflictClassForRow(row, conflictColorMap)}
                isWaitingHuman={isWaitingHuman}
                editingCell={editingCell}
                editValue={editValue}
                preferEditedDate={preferEditedDate}
                langParam={langParam}
                getRowValue={getRowValue}
                onToggleOrderType={onToggleOrderType}
                onMergeStrategyChange={(rowId, strategy) => onMergeStrategyChange?.(rowId, strategy)}
                onDeleteRow={onDeleteRow}
                onStartEditing={onStartEditing}
                onEditValueChange={onEditValueChange}
                onCommitEdit={onCommitEdit}
                onCancelEditing={onCancelEditing}
              />
            );
          })}
          {localNewRows.map((row) => (
            <LocalNewResultRow
              key={row.id}
              row={row}
              editingCell={editingCell}
              editValue={editValue}
              onStartEditing={onStartEditing}
              onEditValueChange={onEditValueChange}
              onCommitEdit={onCommitEdit}
              onCancelEditing={onCancelEditing}
              onRemove={onRemoveLocalNewRow}
            />
          ))}
          {isWaitingHuman && isAddingRow && (
            <AddResultRow
              newRowData={newRowData}
              newRowErrors={newRowErrors}
              onFieldChange={onNewRowFieldChange}
              onSave={onSaveNewRow}
              onCancel={onCancelNewRow}
            />
          )}
        </tbody>
      </table>
    </div>
  );
}

function conflictClassForRow(row: Record<string, unknown>, conflictColorMap: Map<string, string>) {
  const conflict = String(row.conflictFlag ?? "none");
  const pn = String(row.customerPartNumber ?? "");
  return (conflict === "granularity_mismatch" || conflict === "quantity_conflict")
    ? (conflictColorMap.get(`${conflict}::${pn}`) ?? "")
    : "";
}
