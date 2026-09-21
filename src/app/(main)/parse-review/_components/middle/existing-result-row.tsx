"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  readOnly: boolean;
  editingCell: EditingCell;
  editValue: string;
  preferEditedDate: boolean;
  langParam: string | null;
  hidePartNumber?: boolean;
  getRowValue: (rowId: string, field: string, originalValue: unknown) => unknown;
  onToggleOrderType: (rowId: string) => void;
  onMergeStrategyChange: (rowId: string, strategy: "replace" | "increment" | "decrement") => void;
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
  readOnly,
  editingCell,
  editValue,
  preferEditedDate,
  langParam,
  hidePartNumber,
  getRowValue,
  onToggleOrderType,
  onMergeStrategyChange,
  onDeleteRow,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEditing,
}: ExistingResultRowProps) {
  const cellValue = (field: string) => getRowValue(rowId, field, row[field]);
  const conflict = String(row.conflictFlag ?? "none");
  const collectionDate = preferEditedDate
    ? cellValue("dateInfo") ?? cellValue("expandedDay")
    : cellValue("expandedDay") ?? cellValue("dateInfo");

  const editableCell = (field: string, displayValue?: string) => {
    const value = cellValue(field);
    const display = displayValue ?? String(value ?? "");
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

    const content = <span
        className={`editable-cell${isWaitingHuman ? " editable" : ""}`}
        onClick={() => onStartEditing(rowId, field, value)}
        tabIndex={isWaitingHuman ? 0 : undefined}
        onKeyDown={(event) => { if (isWaitingHuman && event.key === "Enter") onStartEditing(rowId, field, value); }}
      >
        {display || <span className="cell-placeholder">—</span>}
      </span>;
    return isWaitingHuman ? <Tooltip><TooltipTrigger asChild>{content}</TooltipTrigger><TooltipContent>点击编辑</TooltipContent></Tooltip> : content;
  };

  const derivedCell = (_field: string, content: ReactNode) => <span className="readonly-cell">{content}</span>;

  return (
    <tr className={conflictClass}>
      {!hidePartNumber && <td>{editableCell("customerPartNumber")}</td>}
      {!hidePartNumber && <td>{derivedCell("internalPartNumber", String(cellValue("internalPartNumber") ?? ""))}</td>}
      <td>{editableCell("quantity")}</td>
      <td>{editableCell("dateInfo", String(collectionDate ?? ""))}</td>
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
        {readOnly ? (
          <span className={`orders-lane-badge ${orderType === "confirmed" ? "firm" : "forecast"}`}>{orderType === "confirmed" ? "Firm" : "Forecast"}</span>
        ) : (
          <button type="button" className="order-type-switch" aria-label="切换 Firm / Forecast" onClick={() => onToggleOrderType(rowId)}>
            <span className={`order-type-option${orderType === "confirmed" ? " active-confirmed" : ""}`}>Firm</span>
            <span className={`order-type-option${orderType === "forecast" ? " active-forecast" : ""}`}>Forecast</span>
          </button>
        )}
      </td>
      <td>
        {readOnly ? (
          <span className="readonly-cell">{mergeStrategyLabel(String(cellValue("mergeStrategy") ?? "replace"))}</span>
        ) : (
          <Select
            value={String(cellValue("mergeStrategy") ?? "replace")}
            disabled={!isWaitingHuman}
            onValueChange={(value) => onMergeStrategyChange(rowId, value as "replace" | "increment" | "decrement")}
          >
            <SelectTrigger className="merge-strategy-trigger" aria-label="合并策略"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="replace">替换</SelectItem>
              <SelectItem value="increment">增加</SelectItem>
              <SelectItem value="decrement">减少</SelectItem>
            </SelectContent>
          </Select>
        )}
      </td>
      <td>{derivedCell("conflictFlag", <ConflictBadge conflict={conflict} details={String(row.conflictDetails ?? "")} />)}</td>
      <td>
        {isWaitingHuman && (
          <Tooltip><TooltipTrigger asChild><button type="button" className="row-delete-btn" aria-label="删除此行" onClick={() => onDeleteRow(rowId)}>
            <Trash2 className="h-3 w-3" />
          </button></TooltipTrigger><TooltipContent>删除此行</TooltipContent></Tooltip>
        )}
      </td>
    </tr>
  );
}

function mergeStrategyLabel(value: string) {
  if (value === "increment") return "增加";
  if (value === "decrement") return "减少";
  return "替换";
}
