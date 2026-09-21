"use client";

import { useMemo, useState, useCallback } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import { BLOCKING_CONFLICT_FLAGS } from "@/types/schemas/tasks";
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
  readOnly: boolean;
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
  onBulkToggleCardOrderType: (cardRowIds: string[]) => void;
  onStartAddingRow: (prefillPartNumber?: string) => void;
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

type PartNumberGroup = {
  partNumber: string;
  internalPartNumber: string;
  rowIndices: number[];
  blockingCount: number;
  informativeCount: number;
  mappingStatus: string;
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
  readOnly,
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
}: ResultTableProps) {
  const [collapsedCards, setCollapsedCards] = useState<Set<string>>(new Set());

  const groups = useMemo<PartNumberGroup[]>(() => {
    const map = new Map<string, PartNumberGroup>();
    const order: string[] = [];
    rows.forEach((row, index) => {
      const pn = String(row.customerPartNumber ?? "");
      if (!map.has(pn)) {
        map.set(pn, {
          partNumber: pn,
          internalPartNumber: String(row.internalPartNumber ?? ""),
          rowIndices: [],
          blockingCount: 0,
          informativeCount: 0,
          mappingStatus: String(row.mappingStatus ?? ""),
        });
        order.push(pn);
      }
      const group = map.get(pn)!;
      group.rowIndices.push(index);
      const flag = String(row.conflictFlag ?? "none");
      if (BLOCKING_CONFLICT_FLAGS.has(flag)) group.blockingCount++;
      else if (flag !== "none" && flag !== "") group.informativeCount++;
      if (!group.internalPartNumber && row.internalPartNumber) {
        group.internalPartNumber = String(row.internalPartNumber);
      }
      if (group.mappingStatus !== "mapped" && row.mappingStatus === "mapped") {
        group.mappingStatus = "mapped";
      }
    });
    return order.map((pn) => map.get(pn)!);
  }, [rows]);

  const toggleCard = useCallback((pn: string) => {
    setCollapsedCards((prev) => {
      const next = new Set(prev);
      if (next.has(pn)) next.delete(pn);
      else next.add(pn);
      return next;
    });
  }, []);

  const toggleAllCards = useCallback(() => {
    setCollapsedCards((prev) => {
      if (prev.size === groups.length) return new Set();
      return new Set(groups.map((g) => g.partNumber));
    });
  }, [groups]);

  if (rows.length === 0 && localNewRows.length === 0 && !isAddingRow) {
    if (!isWaitingHuman) return null;
    return (
      <div className="scroll-x">
        <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)" }}>
          <p style={{ marginBottom: 12 }}>未提取到数据，可手动添加行</p>
          <button type="button" className="proceed-btn" onClick={() => onStartAddingRow()}>
            <Plus className="h-3 w-3" />
            添加行
          </button>
        </div>
      </div>
    );
  }

  const allCollapsed = collapsedCards.size === groups.length;

  return (
    <div className="pn-card-container">
      {/* Global action bar */}
      <div className="pn-card-global-bar">
        <button type="button" className="pn-card-collapse-all" title={allCollapsed ? "展开全部" : "收起全部"} onClick={toggleAllCards}>
          {allCollapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
          <span>{allCollapsed ? "展开全部" : "收起全部"}</span>
        </button>
        {!readOnly ? (
          <button type="button" className={`order-type-bulk-pill ${bulkOrderState}`} title="切换全部 Firm / Forecast" onClick={onBulkToggleOrderType}>
            {bulkOrderState === "firm" ? "Firm" : bulkOrderState === "forecast" ? "Forecast" : "Firm / Forecast"}
          </button>
        ) : null}
      </div>

      {/* Per-part-number cards */}
      {groups.map((group) => {
        const isCollapsed = collapsedCards.has(group.partNumber);
        const cardRowIds = group.rowIndices.map((i) => rowIds[i]);
        const cardOrderValues = cardRowIds.map((id) => orderTypeMap.get(id) ?? "uncertain");
        const cardOrderState: "firm" | "forecast" | "mixed" =
          cardOrderValues.length > 0 && cardOrderValues.every((v) => v === "confirmed") ? "firm"
          : cardOrderValues.length > 0 && cardOrderValues.every((v) => v === "forecast") ? "forecast"
          : "mixed";
        return (
          <div key={group.partNumber} className={`pn-card${group.blockingCount > 0 ? " pn-card-blocking" : ""}${group.informativeCount > 0 && group.blockingCount === 0 ? " pn-card-informative" : ""}`}>
            <button type="button" className="pn-card-header" onClick={() => toggleCard(group.partNumber)}>
              <span className="pn-card-toggle">{isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</span>
              <span className="pn-card-pn">{group.partNumber || "—"}</span>
              {group.internalPartNumber && <span className="pn-card-ipn">{group.internalPartNumber}</span>}
              <span className="pn-card-count">{group.rowIndices.length} 项</span>
              {group.blockingCount > 0 && <span className="pn-card-badge pn-badge-blocking">{group.blockingCount} 冲突</span>}
              {group.informativeCount > 0 && <span className="pn-card-badge pn-badge-info">{group.informativeCount} 提示</span>}
              {group.mappingStatus === "unmapped" && <span className="pn-card-badge pn-badge-unmapped">未映射</span>}
            </button>
            {!isCollapsed && (
              <div className="pn-card-body">
                <div className="scroll-x">
                  <table className="table pn-sub-table">
                    <thead>
                      <tr>
                        <th>Quantity{isWaitingHuman && <span className="th-edit-tag">可编辑</span>}</th>
                        <th>Collection Date{isWaitingHuman && <span className="th-edit-tag">可编辑</span>}</th>
                        <th>Week</th>
                        <th style={{ cursor: "pointer", userSelect: "none" }} title="点击按映射状态排序" onClick={onToggleMappingSort}>
                          Mapping{mappingSortOrder === "asc" ? " ▲" : mappingSortOrder === "desc" ? " ▼" : ""}
                        </th>
                        <th className="order-type-header" style={{ cursor: isWaitingHuman ? "pointer" : undefined, userSelect: "none" }} title={isWaitingHuman ? "切换该物料全部 Firm / Forecast" : undefined} onClick={isWaitingHuman ? () => onBulkToggleCardOrderType(cardRowIds) : undefined}>
                          <span className={`order-type-card-pill ${cardOrderState}`}>
                            {cardOrderState === "firm" ? "Firm" : cardOrderState === "forecast" ? "Forecast" : "Firm / Forecast"}
                          </span>
                        </th>
                        <th>合并策略</th>
                        <th>Conflict</th>
                        <th style={{ width: 36 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {group.rowIndices.map((i) => {
                        const row = rows[i];
                        const rowId = rowIds[i];
                        return (
                          <ExistingResultRow
                            key={rowId}
                            row={row}
                            rowId={rowId}
                            selectedTask={selectedTask}
                            orderType={orderTypeMap.get(rowId) ?? "uncertain"}
                            conflictClass={conflictClassForRow(row, conflictColorMap)}
                            isWaitingHuman={isWaitingHuman}
                            readOnly={readOnly}
                            editingCell={editingCell}
                            editValue={editValue}
                            preferEditedDate={preferEditedDate}
                            langParam={langParam}
                            getRowValue={getRowValue}
                            onToggleOrderType={onToggleOrderType}
                            onMergeStrategyChange={(id, strategy) => onMergeStrategyChange?.(id, strategy)}
                            onDeleteRow={onDeleteRow}
                            onStartEditing={onStartEditing}
                            onEditValueChange={onEditValueChange}
                            onCommitEdit={onCommitEdit}
                            onCancelEditing={onCancelEditing}
                            hidePartNumber
                          />
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {isWaitingHuman && (
                  <button type="button" className="pn-card-add-btn" title={`为 ${group.partNumber} 添加行`} onClick={() => onStartAddingRow(group.partNumber)}>
                    <Plus className="h-3 w-3" />
                    添加行
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Local new rows (pending save) */}
      {localNewRows.length > 0 && (
        <div className="pn-card pn-card-new">
          <div className="pn-card-header-static">
            <span className="pn-card-pn">待保存行</span>
            <span className="pn-card-count">{localNewRows.length} 项</span>
          </div>
          <div className="pn-card-body">
            <div className="scroll-x">
              <table className="table pn-sub-table">
                <thead>
                  <tr>
                    <th>Customer P/N</th>
                    <th>Quantity</th>
                    <th>Date</th>
                    <th colSpan={5} />
                  </tr>
                </thead>
                <tbody>
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add row form (standalone — for new part numbers) */}
      {isWaitingHuman && isAddingRow && (
        <div className="pn-card pn-card-new">
          <div className="pn-card-header-static">
            <span className="pn-card-pn">新增行</span>
          </div>
          <div className="pn-card-body">
            <div className="scroll-x">
              <table className="table pn-sub-table">
                <thead>
                  <tr>
                    <th>Customer P/N</th>
                    <th>Faurecia P/N</th>
                    <th>Quantity</th>
                    <th>Date</th>
                    <th colSpan={5} />
                  </tr>
                </thead>
                <tbody>
                  <AddResultRow
                    newRowData={newRowData}
                    newRowErrors={newRowErrors}
                    onFieldChange={onNewRowFieldChange}
                    onSave={onSaveNewRow}
                    onCancel={onCancelNewRow}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Bottom standalone add-row button */}
      {isWaitingHuman && !isAddingRow && (
        <button type="button" className="pn-card-standalone-add" onClick={() => onStartAddingRow()}>
          <Plus className="h-3.5 w-3.5" />
          添加新物料行
        </button>
      )}
    </div>
  );
}

function conflictClassForRow(row: Record<string, unknown>, conflictColorMap: Map<string, string>) {
  const gk = String(row.conflictGroupKey ?? "");
  if (gk) return conflictColorMap.get(gk) ?? "";
  const conflict = String(row.conflictFlag ?? "none");
  if (conflict !== "none" && conflict !== "") return "conflict-group-red";
  return "";
}
