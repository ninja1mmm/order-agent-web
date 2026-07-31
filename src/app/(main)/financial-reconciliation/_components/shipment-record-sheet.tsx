"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { SearchableFilterSelect } from "@/components/ui/select";
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
import {
  createShipmentRecord,
  updateShipmentRecord,
  type ShipmentRecord,
  type ShipmentRecordDraft,
} from "@/services/reconciliation";
import {
  customerOptions,
  defaultShipmentDraft,
  integerTextToNumber,
  materialNameFromMapping,
  materialOptions,
  normalizeIntegerText,
  shipmentToDraft,
} from "./reconciliation-utils";

type ShipmentRecordSheetProps = {
  open: boolean;
  record: ShipmentRecord | null;
  customers: CustomerConfig[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function ShipmentRecordSheet({ open, record, customers, onOpenChange, onSaved }: ShipmentRecordSheetProps) {
  const [draft, setDraft] = useState<ShipmentRecordDraft>(defaultShipmentDraft(customers));
  const [qtyInput, setQtyInput] = useState(String(defaultShipmentDraft(customers).qty));
  const [saving, setSaving] = useState(false);
  const locked = Boolean(record?.locked);
  const materialSelectOptions = useMemo(
    () => materialOptions(customers, draft.customerId, draft.internalPartNumber),
    [customers, draft.customerId, draft.internalPartNumber],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const nextDraft = record ? shipmentToDraft(record) : defaultShipmentDraft(customers);
      setDraft(nextDraft);
      setQtyInput(String(nextDraft.qty));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customers, open, record]);

  function handleQtyChange(value: string) {
    const normalized = normalizeIntegerText(value);
    setQtyInput(normalized);
    setDraft((current) => ({ ...current, qty: integerTextToNumber(normalized) }));
  }

  function handleQtyBlur() {
    if (!qtyInput || qtyInput === "-") {
      setQtyInput("0");
      setDraft((current) => ({ ...current, qty: 0 }));
    }
  }

  async function handleSave() {
    if (!draft.customerId || !draft.sapCustomerCode || !draft.internalPartNumber || !draft.shipmentDate) {
      toast.error("请补全客户、SAP 客户编码、物料号和发运日期");
      return;
    }
    if (!Number.isInteger(draft.qty)) {
      toast.error("发运数量必须是整数");
      return;
    }
    setSaving(true);
    try {
      if (record) await updateShipmentRecord(record.id, draft, customers);
      else await createShipmentRecord(draft, customers);
      toast.success("发运记录已保存");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error(locked ? "锁定记录不能保存" : "保存发运记录失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>{record ? "编辑发运记录" : "手工新增发运记录"}</SheetTitle>
          <SheetDescription>{locked ? "该记录已锁定，仅可查看。" : "用于补录漏传批次或临时更正后的单条发运数据。"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="stack recon-record-sheet-body">
          <div className="recon-form-field">
            <span className="recon-form-label">客户</span>
            <SearchableFilterSelect
              label="客户"
              value={draft.customerId}
              options={customerOptions(customers, false)}
              placeholder="请选择客户"
              showLabelInTrigger={false}
              className="recon-form-select"
              disabled={locked}
              onChange={(value) => {
                const customer = customers.find((item) => item.id === value);
                setDraft((current) => {
                  const hasCurrentMaterial = customer?.materialMappings.some(
                    (mapping) => mapping.internalPartNumber === current.internalPartNumber,
                  );
                  return {
                    ...current,
                    customerId: value,
                    sapCustomerCode: customer?.code ?? current.sapCustomerCode,
                    internalPartNumber: hasCurrentMaterial ? current.internalPartNumber : "",
                    materialName: hasCurrentMaterial ? current.materialName : "",
                  };
                });
              }}
            />
          </div>
          <div className="grid-2">
            <label className="recon-form-field">
              <span className="recon-form-label">客户编码</span>
              <Input className="recon-form-control" disabled={locked} value={draft.sapCustomerCode} onChange={(event) => setDraft((current) => ({ ...current, sapCustomerCode: event.target.value }))} />
            </label>
            <label className="recon-form-field">
              <span className="recon-form-label">发运日期</span>
              <Input className="recon-form-control" disabled={locked} type="date" value={draft.shipmentDate} onChange={(event) => setDraft((current) => ({ ...current, shipmentDate: event.target.value }))} />
            </label>
            <div className="recon-form-field">
              <span className="recon-form-label">物料</span>
              <SearchableFilterSelect
                label="物料"
                value={draft.internalPartNumber}
                options={materialSelectOptions}
                placeholder="搜索物料号或描述"
                showLabelInTrigger={false}
                className="recon-form-select"
                disabled={locked || materialSelectOptions.length === 0}
                onChange={(value) => setDraft((current) => ({
                  ...current,
                  internalPartNumber: value,
                  materialName: materialNameFromMapping(customers, current.customerId, value) || current.materialName,
                }))}
              />
            </div>
            <label className="recon-form-field">
              <span className="recon-form-label">发运数量</span>
              <Input
                className="recon-form-control"
                disabled={locked}
                inputMode="numeric"
                pattern="-?[0-9]*"
                value={qtyInput}
                onBlur={handleQtyBlur}
                onChange={(event) => handleQtyChange(event.target.value)}
                onKeyDown={(event) => {
                  if ([".", "e", "E", "+"].includes(event.key)) event.preventDefault();
                }}
              />
            </label>
            <label className="recon-form-field">
              <span className="recon-form-label">交货</span>
              <Input className="recon-form-control" disabled={locked} value={draft.deliveryNo} onChange={(event) => setDraft((current) => ({ ...current, deliveryNo: event.target.value }))} />
            </label>
            <label className="recon-form-field">
              <span className="recon-form-label">要货令</span>
              <Input className="recon-form-control" disabled={locked} value={draft.demandOrderNo} onChange={(event) => setDraft((current) => ({ ...current, demandOrderNo: event.target.value }))} />
            </label>
          </div>
          <label className="recon-form-field">
            <span className="recon-form-label">物料描述</span>
            <Input className="recon-form-control" disabled={locked} value={draft.materialName} onChange={(event) => setDraft((current) => ({ ...current, materialName: event.target.value }))} />
          </label>
          <label className="recon-form-field">
            <span className="recon-form-label">备注</span>
            <Textarea className="recon-form-control recon-form-textarea" disabled={locked} value={draft.remark} onChange={(event) => setDraft((current) => ({ ...current, remark: event.target.value }))} />
          </label>
        </SheetBody>
        <SheetFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>关闭</Button>
          <Button variant="primary" disabled={saving || locked} onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> {saving ? "保存中..." : "保存"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
