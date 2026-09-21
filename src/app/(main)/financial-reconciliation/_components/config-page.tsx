"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomerConfig } from "../../_components/shared";
import {
  deleteReconciliationSchedule,
  listConfigRows,
  type ReconciliationConfigRow,
} from "@/services/reconciliation";
import { ConfigSheet } from "./config-sheet";
import { ReconciliationPagination } from "./reconciliation-pagination";
import {
  nextScheduleTaskLabel,
  PAGE_SIZE,
  scheduleBoundaryLabel,
} from "./reconciliation-utils";

export function ConfigPage() {
  const { customers, loading: loadingCustomers } = useCustomerConfig();
  const [rows, setRows] = useState<ReconciliationConfigRow[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [editingRow, setEditingRow] = useState<ReconciliationConfigRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const loadRows = useCallback(async () => {
    if (loadingCustomers) return;
    setLoading(true);
    try {
      setRows(await listConfigRows(customers));
    } catch {
      setRows([]);
      toast.error("加载对账配置失败");
    } finally {
      setLoading(false);
    }
  }, [customers, loadingCustomers]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRows(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadRows, reloadKey]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;
    return rows.filter((row) =>
      `${row.customerName} ${row.customer.code} ${row.schedule?.periodLabel ?? ""}`.toLowerCase().includes(keyword),
    );
  }, [rows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(() => {
    return filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  }, [filteredRows, safePage]);

  async function handleDelete(row: ReconciliationConfigRow) {
    if (!row.schedule) return;
    setLoading(true);
    try {
      await deleteReconciliationSchedule(row.customer.id, row.schedule.scheduleId);
      toast.success("对账计划已删除");
      setReloadKey((value) => value + 1);
    } catch {
      toast.error("删除对账计划失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel scroll-panel screen-fill recon-page">
      <div className="panel-head">
        <h2 className="panel-title">对账配置</h2>
        <div className="list-actions">
          <Button variant="default" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> 刷新
          </Button>
        </div>
      </div>
      <div className="panel-body recon-body">
        <div className="recon-toolbar">
          <Input
            className="recon-config-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="搜索客户或周期"
          />
        </div>
        <div className="scroll-x recon-table-wrap">
          <table className="table recon-table config-table">
            <thead>
              <tr>
                <th>客户</th>
                <th>状态</th>
                <th>周期类型</th>
                <th>对账开始</th>
                <th>对账截止</th>
                <th>任务触发时间</th>
                <th>下次任务</th>
                <th className="recon-actions-col">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.key}>
                  <td className="font-black">{row.customerName}</td>
                  <td>
                    <Badge variant={row.schedule ? (row.schedule.enabled ? "green" : "slate") : "amber"}>
                      {row.schedule ? (row.schedule.enabled ? "启用" : "停用") : "未配置"}
                    </Badge>
                  </td>
                  <td>{row.schedule ? (row.schedule.periodType === "weekly" ? "周度" : "月度") : "-"}</td>
                  <td>{row.schedule ? scheduleBoundaryLabel(row.schedule, "start") : "-"}</td>
                  <td>{row.schedule ? scheduleBoundaryLabel(row.schedule, "end") : "-"}</td>
                  <td>{row.schedule?.triggerLabel ?? "-"}</td>
                  <td>{row.schedule ? nextScheduleTaskLabel(row.schedule) : <span className="recon-muted-inline">未配置</span>}</td>
                  <td>
                    <div className="recon-row-actions">
                      <Button size="icon-sm" tooltip={row.schedule ? "编辑" : "新增"} onClick={() => setEditingRow(row)}>
                        {row.schedule ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        tooltip="删除计划"
                        disabled={!row.schedule}
                        onClick={() => { void handleDelete(row); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? (
            <div className="recon-state"><LoaderCircle className="h-4 w-4 animate-spin" /> 加载配置...</div>
          ) : null}
          {!loading && filteredRows.length === 0 ? <div className="recon-state">暂无客户配置</div> : null}
        </div>
        <ReconciliationPagination
          page={safePage}
          totalPages={totalPages}
          total={filteredRows.length}
          onPageChange={setPage}
        />
      </div>
      <ConfigSheet
        open={Boolean(editingRow)}
        row={editingRow}
        onOpenChange={(open) => { if (!open) setEditingRow(null); }}
        onSaved={() => setReloadKey((value) => value + 1)}
      />
    </section>
  );
}
