"use client";

import { Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EditingCell, LocalNewRow } from "../parse-review-types";
import { InlineEditInput } from "./inline-edit-input";

type LocalNewResultRowProps = {
  row: LocalNewRow;
  editingCell: EditingCell;
  editValue: string;
  onStartEditing: (rowId: string, field: string, currentValue: unknown) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEditing: () => void;
  onRemove: (rowId: string) => void;
};

export function LocalNewResultRow({
  row,
  editingCell,
  editValue,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEditing,
  onRemove,
}: LocalNewResultRowProps) {
  const cell = (field: "customerPartNumber" | "quantity" | "dateInfo") => {
    const value = row[field];
    if (editingCell?.rowId === row.id && editingCell?.field === field) {
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
      <Tooltip><TooltipTrigger asChild><span className="editable-cell editable" tabIndex={0} onClick={() => onStartEditing(row.id, field, value)} onKeyDown={(event) => { if (event.key === "Enter") onStartEditing(row.id, field, value); }}>
        {String(value) || <span className="cell-placeholder">—</span>}
      </span></TooltipTrigger><TooltipContent>点击编辑</TooltipContent></Tooltip>
    );
  };

  return (
    <tr className="new-row-tr">
      <td>{cell("customerPartNumber")}</td>
      <td><span className="readonly-cell">—</span></td>
      <td>{cell("quantity")}</td>
      <td>{cell("dateInfo")}</td>
      <td><span className="readonly-cell">—</span></td>
      <td><span className="readonly-cell">—</span></td>
      <td>—</td>
      <td>替换</td>
      <td>—</td>
      <td>
        <Tooltip><TooltipTrigger asChild><button type="button" className="row-delete-btn" aria-label="移除新增行" onClick={() => onRemove(row.id)}>
          <Trash2 className="h-3 w-3" />
        </button></TooltipTrigger><TooltipContent>移除新增行</TooltipContent></Tooltip>
      </td>
    </tr>
  );
}
