"use client";

import { Trash2 } from "lucide-react";
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
      <span className="editable-cell editable" onClick={() => onStartEditing(row.id, field, value)} title="点击编辑">
        {String(value) || <span className="cell-placeholder">—</span>}
      </span>
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
        <button type="button" className="row-delete-btn" title="移除新增行" onClick={() => onRemove(row.id)}>
          <Trash2 className="h-3 w-3" />
        </button>
      </td>
    </tr>
  );
}
