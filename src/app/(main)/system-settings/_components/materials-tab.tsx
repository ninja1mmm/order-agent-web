"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerConfig } from "@/services/settings";

type MaterialsTabProps = {
  draft: CustomerConfig;
  onDraftChange: (draft: CustomerConfig) => void;
  onAddMaterial: () => void;
  onRemoveMaterial: (index: number) => void;
};

export function MaterialsTab({
  draft,
  onDraftChange,
  onAddMaterial,
  onRemoveMaterial,
}: MaterialsTabProps) {
  return (
    <div className="settings-material-tab">
      <div className="row" style={{ marginBottom: 8 }}>
        <p className="mini-title" style={{ marginBottom: 0 }}>物料映射</p>
        <div className="list-actions">
          <Button variant="default" size="sm" onClick={onAddMaterial}>
            <Plus className="h-3.5 w-3.5" /> 新增
          </Button>
        </div>
      </div>
      <div className="scroll-x settings-material-table">
        <table className="table">
          <thead>
            <tr>
              <th>Customer P/N</th>
              <th>Faurecia P/N</th>
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {(draft.materialMappings ?? []).map((mapping, index) => (
              <tr key={mapping.mappingId}>
                <td>
                  <Input
                    value={mapping.customerPartNumber}
                    placeholder="Customer P/N"
                    onChange={(event) => {
                      const materialMappings = [...(draft.materialMappings ?? [])];
                      materialMappings[index] = {
                        ...mapping,
                        customerPartNumber: event.target.value,
                      };
                      onDraftChange({ ...draft, materialMappings });
                    }}
                  />
                </td>
                <td>
                  <Input
                    value={mapping.internalPartNumber}
                    placeholder="Faurecia P/N"
                    onChange={(event) => {
                      const materialMappings = [...(draft.materialMappings ?? [])];
                      materialMappings[index] = {
                        ...mapping,
                        internalPartNumber: event.target.value,
                      };
                      onDraftChange({ ...draft, materialMappings });
                    }}
                  />
                </td>
                <td>
                  <button type="button" className="icon-link" onClick={() => onRemoveMaterial(index)} title="删除">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(draft.materialMappings ?? []).length === 0 ? (
          <p className="item-meta" style={{ marginTop: 12 }}>暂无物料映射，点击「新增」添加。</p>
        ) : null}
      </div>
    </div>
  );
}
