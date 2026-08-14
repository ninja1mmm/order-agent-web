"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { createReconciliationTask } from "@/services/reconciliation";
import { customerOptions, firstDayOfMonth, todayKey } from "./reconciliation-utils";

type TaskCreateSheetProps = {
  open: boolean;
  customers: CustomerConfig[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function TaskCreateSheet({ open, customers, onOpenChange, onCreated }: TaskCreateSheetProps) {
  const [customerId, setCustomerId] = useState("");
  const [periodFrom, setPeriodFrom] = useState(firstDayOfMonth());
  const [periodTo, setPeriodTo] = useState(todayKey());
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || customerId) return;
    const timer = window.setTimeout(() => {
      setCustomerId(customers[0]?.id ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customerId, customers, open]);

  async function handleCreate() {
    if (!customerId) {
      toast.error("请选择客户");
      return;
    }
    if (!periodFrom || !periodTo || periodFrom > periodTo) {
      toast.error("对账期间不合法");
      return;
    }
    setSaving(true);
    try {
      await createReconciliationTask({
        customerId,
        periodFrom,
        periodTo,
        remark,
      }, customers);
      toast.success("对账任务已创建");
      onCreated();
      onOpenChange(false);
    } catch {
      toast.error("创建对账任务失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>新建对账任务</SheetTitle>
          <SheetDescription>
            手工新增用于临时补账或特殊周期；常规任务由对账配置自动生成。
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="stack">
          <SearchableFilterSelect
            label="客户"
            value={customerId}
            options={customerOptions(customers, false)}
            onChange={setCustomerId}
            placeholder="搜索客户"
          />
          <div className="grid-2">
            <label className="filter-field">
              <span className="filter-label">对账开始日期</span>
              <Input type="date" value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} />
            </label>
            <label className="filter-field">
              <span className="filter-label">对账截止日期</span>
              <Input type="date" value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} />
            </label>
          </div>
          <label className="filter-field">
            <span className="filter-label">新增任务备注</span>
            <Input value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="补账原因或特殊周期说明" />
          </label>
        </SheetBody>
        <SheetFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="primary" disabled={saving} onClick={handleCreate}>
            <Save className="h-3.5 w-3.5" /> {saving ? "创建中..." : "创建任务"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
