"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
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
  createReceiptRecord,
  updateReceiptRecord,
  type ReceiptRecord,
  type ReceiptRecordDraft,
} from "@/services/reconciliation";
import {
  customerOptions,
  defaultReceiptDraft,
  integerTextToNumber,
  materialNameFromMapping,
  materialOptions,
  normalizeIntegerText,
  receiptToDraft,
} from "./reconciliation-utils";

type ReceiptRecordSheetProps = {
  open: boolean;
  record: ReceiptRecord | null;
  customers: CustomerConfig[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function ReceiptRecordSheet({ open, record, customers, onOpenChange, onSaved }: ReceiptRecordSheetProps) {
  const [draft, setDraft] = useState<ReceiptRecordDraft>(defaultReceiptDraft(customers));
  const [qtyInput, setQtyInput] = useState(String(defaultReceiptDraft(customers).qty));
  const [saving, setSaving] = useState(false);
  const locked = Boolean(record?.locked);
  const materialSelectOptions = useMemo(
    () => materialOptions(customers, draft.customerId, draft.internalPartNumber),
    [customers, draft.customerId, draft.internalPartNumber],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      const nextDraft = record ? receiptToDraft(record) : defaultReceiptDraft(customers);
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
    if (!draft.customerId || !draft.internalPartNumber || !draft.receiptDate) {
      toast.error("请补全客户、物料号和收货日期");
      return;
    }
    if (!Number.isInteger(draft.qty)) {
      toast.error("收货数量必须是整数");
      return;
    }
    setSaving(true);
    try {
      if (record) await updateReceiptRecord(record.id, draft, customers);
      else await createReceiptRecord(draft, customers);
      toast.success("收货记录已保存");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error(locked ? "锁定记录不能保存" : "保存收货记录失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>{record ? "编辑收货记录" : "手工新增收货记录"}</SheetTitle>
          <SheetDescription>{locked ? "该记录已锁定，仅可查看。" : "用于补录客户漏传或跨周期回传的单条收货数据。"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="stack recon-record-sheet-body">
          <div className="grid-2">
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
                      internalPartNumber: hasCurrentMaterial ? current.internalPartNumber : "",
                      materialName: hasCurrentMaterial ? current.materialName : "",
                    };
                  });
                }}
              />
            </div>
            <div className="recon-form-field">
              <span className="recon-form-label">客户类型</span>
              <FilterSelect
                label="客户类型"
                value={draft.customerType}
                options={[
                  { value: "internal", label: "内部" },
                  { value: "external", label: "外部" },
                ]}
                placeholder="请选择客户类型"
                showLabelInTrigger={false}
                className="recon-form-select"
                disabled={locked}
                onChange={(value) => setDraft((current) => ({ ...current, customerType: value }))}
              />
            </div>
          </div>
          <div className="grid-2">
            <label className="recon-form-field">
              <span className="recon-form-label">收货日期</span>
              <Input className="recon-form-control" disabled={locked} type="date" value={draft.receiptDate} onChange={(event) => setDraft((current) => ({ ...current, receiptDate: event.target.value }))} />
            </label>
            <label className="recon-form-field">
              <span className="recon-form-label">收货数量</span>
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
