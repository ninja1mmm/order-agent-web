"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, LoaderCircle, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
import { useCustomerConfig } from "../../_components/shared";
import {
  deleteShipmentRecord,
  listShipmentRecords,
  type ShipmentRecord,
} from "@/services/reconciliation";
import {
  canEditLocked,
  customerOptions,
  formatDate,
  formatQty,
  PAGE_SIZE,
} from "./reconciliation-utils";
import { reconciliationStatusOptions } from "./reconciliation-types";
import { ReconciliationPagination } from "./reconciliation-pagination";
import { ShipmentImportDialog } from "./shipment-import-dialog";
import { ShipmentRecordSheet } from "./shipment-record-sheet";

export function ShipmentRecordsPage() {
  const { customers, loading: loadingCustomers } = useCustomerConfig();
  const [records, setRecords] = useState<ShipmentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ShipmentRecord | null | undefined>(undefined);
  const [importOpen, setImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const options = useMemo(() => customerOptions(customers), [customers]);

  const loadRecords = useCallback(async () => {
    if (loadingCustomers) return;
    setLoading(true);
    try {
      const response = await listShipmentRecords({
        page,
        size: PAGE_SIZE,
        customerId: customerId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        reconciliationStatus: status || undefined,
      }, customers);
      setRecords(response.records);
      setTotal(response.total);
    } catch {
      setRecords([]);
      setTotal(0);
      toast.error("加载发运记录失败");
    } finally {
      setLoading(false);
    }
  }, [customerId, customers, dateFrom, dateTo, loadingCustomers, page, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRecords(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecords, reloadKey]);

  async function handleDelete(record: ShipmentRecord) {
    if (record.locked) {
      toast.error(canEditLocked(record.locked));
      return;
    }
    setLoading(true);
    try {
      await deleteShipmentRecord(record.id);
      toast.success("发运记录已删除");
      setReloadKey((value) => value + 1);
    } catch {
      toast.error("删除发运记录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel scroll-panel screen-fill recon-page">
      <div className="panel-head">
        <h2 className="panel-title">发运记录</h2>
        <div className="list-actions">
          <Button variant="default" size="sm" onClick={() => setEditingRecord(null)}>
            <Plus className="h-3.5 w-3.5" /> 手工新增
          </Button>
          <Button variant="primary" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" /> 上传批次
          </Button>
        </div>
      </div>
      <div className="panel-body recon-body">
        <div className="recon-toolbar">
          <SearchableFilterSelect label="客户" value={customerId} options={options} onChange={(value) => { setCustomerId(value); setPage(1); }} />
          <FilterSelect label="状态" value={status} options={reconciliationStatusOptions} onChange={(value) => { setStatus(value); setPage(1); }} />
          <label className="recon-date-filter-card">
            <span>开始日期：</span>
            <Input type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
          </label>
          <label className="recon-date-filter-card">
            <span>结束日期：</span>
            <Input type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
          </label>
        </div>
        <div className="scroll-x recon-table-wrap">
          <table className="table recon-table shipment-record-table">
            <thead>
              <tr>
                <th>客户</th>
                <th>发运日期</th>
                <th>物料</th>
                <th className="num">发运数量</th>
                <th className="num">已对账</th>
                <th>对账状态</th>
                <th>交货</th>
                <th>要货令</th>
                <th>来源</th>
                <th className="recon-actions-col">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="font-black">{record.customerName}</td>
                  <td>{formatDate(record.shipmentDate)}</td>
                  <td>{record.internalPartNumber}</td>
                  <td className="num">{formatQty(record.qty)}</td>
                  <td className="num">{formatQty(record.matchedReceiptQty)}</td>
                  <td><Badge variant={record.statusVariant}>{record.reconciliationStatusLabel}</Badge></td>
                  <td>{record.deliveryNo ?? "-"}</td>
                  <td>{record.demandOrderNo ?? "-"}</td>
                  <td>{record.sourceFileId ? "本次导入" : "手工新增"}</td>
                  <td>
                    <div className="recon-row-actions">
                      <Button size="icon-sm" title={record.locked ? "查看" : "编辑"} onClick={() => setEditingRecord(record)}>
                        {record.locked ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        title={canEditLocked(record.locked) ?? "删除"}
                        disabled={record.locked}
                        onClick={() => { void handleDelete(record); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <div className="recon-state"><LoaderCircle className="h-4 w-4 animate-spin" /> 加载发运记录...</div> : null}
          {!loading && records.length === 0 ? <div className="recon-state">暂无发运记录</div> : null}
        </div>
        <ReconciliationPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
      <ShipmentRecordSheet
        open={editingRecord !== undefined}
        record={editingRecord ?? null}
        customers={customers}
        onOpenChange={(open) => { if (!open) setEditingRecord(undefined); }}
        onSaved={() => setReloadKey((value) => value + 1)}
      />
      <ShipmentImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onMerged={() => setReloadKey((value) => value + 1)}
      />
    </section>
  );
}
