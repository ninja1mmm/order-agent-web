"use client";

import { useState } from "react";
import { Pencil, Plus, Save, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CustomerConfig } from "@/services/settings";
import { ReconciliationPagination } from "../../financial-reconciliation/_components/reconciliation-pagination";

type MaterialMapping = CustomerConfig["materialMappings"][number];

type MaterialsTabProps = {
  draft: CustomerConfig;
  onDraftChange: (draft: CustomerConfig) => void;
  onRemoveMaterial: (index: number) => void;
};

const MATERIAL_PAGE_SIZE = 8;

function emptyMapping(): MaterialMapping {
  return {
    mappingId: crypto.randomUUID(),
    customerPartNumber: "",
    internalPartNumber: "",
    scheduleAgreement: null,
    productType: null,
    productionLine: null,
    oem: null,
    program: null,
    designation: null,
    deliveryLocation: null,
    status: "active",
  };
}

function displayValue(value: string | null | undefined) {
  return value?.trim() ? value : <span className="recon-muted-inline">-</span>;
}

type MaterialMappingSheetProps = {
  open: boolean;
  mode: "create" | "edit";
  value: MaterialMapping;
  onOpenChange: (open: boolean) => void;
  onValueChange: (value: MaterialMapping) => void;
  onSave: () => void;
};

function MaterialMappingSheet({
  open,
  mode,
  value,
  onOpenChange,
  onValueChange,
  onSave,
}: MaterialMappingSheetProps) {
  const requiredMissing = !value.customerPartNumber.trim() || !value.internalPartNumber.trim();

  const updateField = (field: keyof MaterialMapping, nextValue: string) => {
    onValueChange({
      ...value,
      [field]: nextValue.trim() ? nextValue : null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "新增物料映射" : "编辑物料映射"}</SheetTitle>
          <SheetDescription>
            修改会先保存在当前客户草稿中，点击页面右上角保存后写入后端配置。
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="stack">
          <div className="grid-2">
            <label className="filter-field">
              <span className="filter-label">Customer P/N</span>
              <Input
                value={value.customerPartNumber}
                onChange={(event) => onValueChange({ ...value, customerPartNumber: event.target.value })}
                placeholder="Customer P/N"
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">Faurecia P/N</span>
              <Input
                value={value.internalPartNumber}
                onChange={(event) => onValueChange({ ...value, internalPartNumber: event.target.value })}
                placeholder="Faurecia P/N"
              />
            </label>
          </div>
          <label className="filter-field">
            <span className="filter-label">Designation</span>
            <Input
              value={value.designation ?? ""}
              onChange={(event) => updateField("designation", event.target.value)}
              placeholder="Designation"
            />
          </label>
          <div className="grid-2">
            <label className="filter-field">
              <span className="filter-label">SA 号</span>
              <Input
                value={value.scheduleAgreement ?? ""}
                onChange={(event) => updateField("scheduleAgreement", event.target.value)}
                placeholder="SA 号"
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">Type</span>
              <Input
                value={value.productType ?? ""}
                onChange={(event) => updateField("productType", event.target.value)}
                placeholder="Type"
              />
            </label>
          </div>
          <div className="grid-2">
            <label className="filter-field">
              <span className="filter-label">OEM</span>
              <Input
                value={value.oem ?? ""}
                onChange={(event) => updateField("oem", event.target.value)}
                placeholder="OEM"
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">Program</span>
              <Input
                value={value.program ?? ""}
                onChange={(event) => updateField("program", event.target.value)}
                placeholder="Program"
              />
            </label>
          </div>
          <label className="filter-field">
            <span className="filter-label">提货地点</span>
            <Input
              value={value.deliveryLocation ?? ""}
              onChange={(event) => updateField("deliveryLocation", event.target.value)}
              placeholder="提货地点"
            />
          </label>
        </SheetBody>
        <SheetFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="primary" disabled={requiredMissing} onClick={onSave}>
            <Save className="h-3.5 w-3.5" /> 保存映射
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function MaterialsTab({
  draft,
  onDraftChange,
  onRemoveMaterial,
}: MaterialsTabProps) {
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [sheetDraft, setSheetDraft] = useState<MaterialMapping>(() => emptyMapping());
  const mappings = draft.materialMappings ?? [];
  const totalPages = Math.max(1, Math.ceil(mappings.length / MATERIAL_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (safePage - 1) * MATERIAL_PAGE_SIZE;
  const pageMappings = mappings.slice(pageStart, pageStart + MATERIAL_PAGE_SIZE);

  const openCreateSheet = () => {
    setEditingIndex(null);
    setSheetDraft(emptyMapping());
    setSheetOpen(true);
  };

  const openEditSheet = (index: number, mapping: MaterialMapping) => {
    setEditingIndex(index);
    setSheetDraft({ ...mapping });
    setSheetOpen(true);
  };

  const saveSheetDraft = () => {
    const materialMappings = [...mappings];
    if (editingIndex === null) {
      materialMappings.push(sheetDraft);
      setPage(Math.max(1, Math.ceil(materialMappings.length / MATERIAL_PAGE_SIZE)));
    } else {
      materialMappings[editingIndex] = sheetDraft;
    }
    onDraftChange({ ...draft, materialMappings });
    setSheetOpen(false);
  };

  return (
    <div className="settings-material-tab">
      <div className="row" style={{ marginBottom: 8 }}>
        <p className="mini-title" style={{ marginBottom: 0 }}>物料映射</p>
        <div className="list-actions">
          <Button variant="default" size="sm" disabled title="导入接口暂未开放">
            <Upload className="h-3.5 w-3.5" /> 导入
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateSheet}>
            <Plus className="h-3.5 w-3.5" /> 新增
          </Button>
        </div>
      </div>
      <div className="scroll-x recon-table-wrap settings-material-table">
        <table className="table recon-table settings-material-data-table">
          <thead>
            <tr>
              <th>Customer P/N</th>
              <th>Faurecia P/N</th>
              <th>Designation</th>
              <th>SA 号</th>
              <th>Type</th>
              <th>OEM</th>
              <th>Program</th>
              <th>提货地点</th>
              <th className="recon-actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            {pageMappings.map((mapping, index) => {
              const mappingIndex = pageStart + index;
              return (
                <tr key={mapping.mappingId}>
                  <td className="font-black">{displayValue(mapping.customerPartNumber)}</td>
                  <td>{displayValue(mapping.internalPartNumber)}</td>
                  <td>{displayValue(mapping.designation)}</td>
                  <td>{displayValue(mapping.scheduleAgreement)}</td>
                  <td>{displayValue(mapping.productType)}</td>
                  <td>{displayValue(mapping.oem)}</td>
                  <td>{displayValue(mapping.program)}</td>
                  <td>{displayValue(mapping.deliveryLocation)}</td>
                  <td>
                    <div className="recon-row-actions">
                      <Button size="icon-sm" title="编辑" onClick={() => openEditSheet(mappingIndex, mapping)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        title="删除"
                        onClick={() => onRemoveMaterial(mappingIndex)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {mappings.length === 0 ? (
          <div className="recon-state inline">暂无物料映射</div>
        ) : null}
      </div>
      <ReconciliationPagination
        page={safePage}
        totalPages={totalPages}
        total={mappings.length}
        onPageChange={setPage}
      />
      <MaterialMappingSheet
        open={sheetOpen}
        mode={editingIndex === null ? "create" : "edit"}
        value={sheetDraft}
        onOpenChange={setSheetOpen}
        onValueChange={setSheetDraft}
        onSave={saveSheetDraft}
      />
    </div>
  );
}
