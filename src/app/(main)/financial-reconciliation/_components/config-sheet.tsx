"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

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
import {
  createReconciliationSchedule,
  updateReconciliationSchedule,
  type ReconciliationConfigRow,
  type ReconciliationScheduleDraft,
} from "@/services/reconciliation";
import { defaultScheduleDraft, scheduleToDraft } from "./reconciliation-utils";

type ConfigSheetProps = {
  open: boolean;
  row: ReconciliationConfigRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function ConfigSheet({ open, row, onOpenChange, onSaved }: ConfigSheetProps) {
  const [draft, setDraft] = useState<ReconciliationScheduleDraft>(defaultScheduleDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setDraft(row?.schedule ? scheduleToDraft(row.schedule) : defaultScheduleDraft());
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, row]);

  async function handleSave() {
    if (!row) return;
    if (!draft.triggerTime.match(/^\d{2}:\d{2}$/)) {
      toast.error("触发时间格式应为 HH:MM");
      return;
    }
    setSaving(true);
    try {
      const monthlyDraft = { ...draft, periodType: "monthly" as const };
      if (row.schedule) {
        await updateReconciliationSchedule(row.customer.id, row.schedule.scheduleId, monthlyDraft);
      } else {
        await createReconciliationSchedule(row.customer.id, monthlyDraft);
      }
      toast.success("对账配置已保存");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("保存对账配置失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>{row?.schedule ? "编辑对账计划" : "新增对账计划"}</SheetTitle>
          <SheetDescription>
            {row?.customerName ?? "-"}。月度周期按上月开始日到本月截止日生成任务。
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="stack">
          <div className="grid-2">
            <label className="filter-field">
              <span className="filter-label">上月开始日</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={draft.periodStartDay}
                onChange={(event) => setDraft((current) => ({ ...current, periodStartDay: Number(event.target.value) }))}
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">本月截止日</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={draft.periodEndDay}
                onChange={(event) => setDraft((current) => ({ ...current, periodEndDay: Number(event.target.value) }))}
              />
            </label>
          </div>
          <div className="grid-2">
            <label className="filter-field">
              <span className="filter-label">触发日</span>
              <Input
                type="number"
                min={1}
                max={31}
                value={draft.triggerDay}
                onChange={(event) => setDraft((current) => ({ ...current, triggerDay: Number(event.target.value) }))}
              />
            </label>
            <label className="filter-field">
              <span className="filter-label">触发时间</span>
              <Input
                type="time"
                value={draft.triggerTime}
                onChange={(event) => setDraft((current) => ({ ...current, triggerTime: event.target.value }))}
              />
            </label>
          </div>
          <label className="recon-toggle">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(event) => setDraft((current) => ({ ...current, enabled: event.target.checked }))}
            />
            启用计划
          </label>
        </SheetBody>
        <SheetFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="primary" disabled={saving} onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> {saving ? "保存中..." : "保存配置"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
