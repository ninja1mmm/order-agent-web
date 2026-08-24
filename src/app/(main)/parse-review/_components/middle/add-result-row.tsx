"use client";

import { Check, X } from "lucide-react";
import type { NewRowData } from "../parse-review-types";

type AddResultRowProps = {
  newRowData: NewRowData;
  newRowErrors: Record<string, string>;
  onFieldChange: (field: keyof NewRowData, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function AddResultRow({
  newRowData,
  newRowErrors,
  onFieldChange,
  onSave,
  onCancel,
}: AddResultRowProps) {
  return (
    <tr className="add-row-tr">
      <td>
        <input
          className={`inline-edit-input${newRowErrors.customerPartNumber ? " input-error" : ""}`}
          value={newRowData.customerPartNumber}
          onChange={(event) => onFieldChange("customerPartNumber", event.target.value)}
          placeholder="Customer P/N *"
          autoFocus
        />
      </td>
      <td><span className="readonly-cell">—</span></td>
      <td>
        <input
          className={`inline-edit-input${newRowErrors.quantity ? " input-error" : ""}`}
          type="number"
          value={newRowData.quantity}
          onChange={(event) => onFieldChange("quantity", event.target.value)}
          placeholder="Quantity *"
        />
      </td>
      <td>
        <input
          className={`inline-edit-input${newRowErrors.dateInfo ? " input-error" : ""}`}
          value={newRowData.dateInfo}
          onChange={(event) => onFieldChange("dateInfo", event.target.value)}
          placeholder="Date *"
        />
      </td>
      <td><span className="readonly-cell">—</span></td>
      <td><span className="readonly-cell">—</span></td>
      <td>—</td>
      <td>替换</td>
      <td>—</td>
      <td>
        <div className="add-row-actions">
          <button type="button" className="row-action-btn save" title="保存" onClick={onSave}>
            <Check className="h-3 w-3" />
          </button>
          <button type="button" className="row-action-btn cancel" title="取消" onClick={onCancel}>
            <X className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}
