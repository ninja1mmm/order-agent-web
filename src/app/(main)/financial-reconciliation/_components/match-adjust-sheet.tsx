"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { confirmReconciliationMatch, type ReconciliationMatch } from "@/services/reconciliation";

type MatchAdjustSheetProps = {
  taskId: string;
  match: ReconciliationMatch | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function MatchAdjustSheet({ taskId, match, onOpenChange, onSaved }: MatchAdjustSheetProps) {
  const [matchedQty, setMatchedQty] = useState(0);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMatchedQty(match?.matchedQty ?? 0);
      setRemark(match?.remark ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [match]);

  async function handleSave() {
    if (!match) return;
    if (matchedQty <= 0) {
      toast.error("确认数量必须大于 0");
      return;
    }
    setSaving(true);
    try {
      await confirmReconciliationMatch(taskId, match.id, { matchedQty, remark: remark || null });
      toast.success("匹配已确认");
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("确认匹配失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={Boolean(match)} onOpenChange={onOpenChange}>
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetTitle>确认匹配</SheetTitle>
          <SheetDescription>可按业务差异调整本次确认数量并补充备注。</SheetDescription>
        </SheetHeader>
        <SheetBody className="stack">
          <label className="filter-field">
            <span className="filter-label">确认数量</span>
            <Input type="number" value={matchedQty} onChange={(event) => setMatchedQty(Number(event.target.value))} />
          </label>
          <label className="filter-field">
            <span className="filter-label">备注</span>
            <Textarea value={remark} onChange={(event) => setRemark(event.target.value)} />
          </label>
          <div className="recon-note">
            <span>发运：{match?.shipment?.deliveryNo ?? match?.shipmentRecordId ?? "-"}</span>
            <span>收货：{match?.receipt?.demandOrderNo ?? match?.receiptRecordId ?? "-"}</span>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>取消</Button>
          <Button variant="primary" disabled={saving} onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> {saving ? "确认中..." : "确认"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
