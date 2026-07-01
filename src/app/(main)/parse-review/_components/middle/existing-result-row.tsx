"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import type { WorkspaceTask } from "@/services/inbox";
import type { EditingCell, OrderType } from "../parse-review-types";
import { ConflictBadge } from "./conflict-badge";
import { InlineEditInput } from "./inline-edit-input";
import { MappingStatus } from "./mapping-status";

type ExistingResultRowProps = {
  row: Record<string, unknown>;
  rowId: string;
  selectedTask: WorkspaceTask | undefined;
  orderType: OrderType;
  conflictClass: string;
  isWaitingHuman: boolean;
  editingCell: EditingCell;
  editValue: string;
  langParam: string | null;
  getRowValue: (rowId: string, field: string, originalValue: unknown) => unknown;
  isFieldStale: (fieldName: string) => boolean;
  onToggleOrderType: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onStartEditing: (rowId: string, field: string, currentValue: unknown) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEditing: () => void;
};

export function ExistingResultRow({
  row,
  rowId,
  selectedTask,
  orderType,
  conflictClass,
  isWaitingHuman,
  editingCell,
  editValue,
  langParam,
  getRowValue,
  isFieldStale,
  onToggleOrderType,
  onDeleteRow,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEditing,
}: ExistingResultRowProps) {
  const cellValue = (field: string) => getRowValue(rowId, field, row[field]);
  const conflict = String(row.conflictFlag ?? "none");

  const editableCell = (field: string, displayValue?: string) => {
    const value = cellValue(field);
    const display = displayValue ?? String(value ?? "");
    const stale = isFieldStale(field);

    if (editingCell?.rowId === rowId && editingCell?.field === field) {
      return (
        <InlineEditInput
          field={field}
          value={editValue}
          onChange={onEditValueChange}
          onCommit={onCommitEdit}
          onCancel={onCancelEditing}
        />
      );
    }

    return (
      <span
        className={`editable-cell${isWaitingHuman ? " editable" : ""}${stale ? " stale" : ""}`}
        onClick={() => onStartEditing(rowId, field, value)}
        title={stale ? "此字段将在继续流程后重新计算" : isWaitingHuman ? "点击编辑" : undefined}
      >
        {display || <span className="cell-placeholder">—</span>}
      </span>
    );
  };

  const derivedCell = (field: string, content: ReactNode) => {
    const stale = isFieldStale(field);
    return (
      <span className={`readonly-cell${stale ? " stale" : ""}`} title={stale ? "待重新计算" : undefined}>
        {content}
      </span>
    );
  };

  return (
    <tr className={conflictClass}>
      <td>{editableCell("customerPartNumber")}</td>
      <td>{derivedCell("internalPartNumber", String(cellValue("internalPartNumber") ?? ""))}</td>
      <td>{editableCell("quantity")}</td>
      <td>{editableCell("dateInfo", String(cellValue("expandedDay") ?? cellValue("dateInfo") ?? ""))}</td>
      <td>{derivedCell("expandedWeek", String(cellValue("expandedWeek") ?? ""))}</td>
      <td>
        {derivedCell("mappingStatus", (
          <MappingStatus
            value={cellValue("mappingStatus")}
            selectedTask={selectedTask}
            customerPartNumber={String(cellValue("customerPartNumber") ?? "")}
            langParam={langParam}
          />
        ))}
      </td>
      <td>
        <div className="order-type-switch" onClick={() => onToggleOrderType(rowId)}>
          <span className={`order-type-option${orderType === "confirmed" ? " active-confirmed" : ""}`}>Firm</span>
          <span className={`order-type-option${orderType === "forecast" ? " active-forecast" : ""}`}>Forecast</span>
        </div>
      </td>
      <td>{derivedCell("conflictFlag", <ConflictBadge conflict={conflict} details={String(row.conflictDetails ?? "")} />)}</td>
      <td>
        {isWaitingHuman && (
          <button type="button" className="row-delete-btn" title="删除此行" onClick={() => onDeleteRow(rowId)}>
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </td>
    </tr>
  );
}
