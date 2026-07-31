"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, LoaderCircle, Save, ScanSearch, Upload } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
import type { CustomerConfig } from "@/services/settings";
import {
  listParsedReconciliationRecords,
  mergeReconciliationFile,
  updateParsedRecordResolution,
  uploadReconciliationFile,
  type MergeReview,
} from "@/services/reconciliation";
import { importResolutionOptions } from "./reconciliation-types";
import { customerOptions, normalizedValuePreview } from "./reconciliation-utils";

type ReceiptImportDialogProps = {
  open: boolean;
  customers: CustomerConfig[];
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
};

export function ReceiptImportDialog({ open, customers, onOpenChange, onMerged }: ReceiptImportDialogProps) {
  const [customerId, setCustomerId] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [review, setReview] = useState<MergeReview | null>(null);
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => customerOptions(customers, false), [customers]);
  const saveText = review
    ? `${review.validCount} 行可写入，${review.blockedCount} 行阻塞，${review.ignoredCount} 行不写入`
    : "等待解析结果";

  useEffect(() => {
    if (!open || customerId) return;
    const timer = window.setTimeout(() => {
      setCustomerId(customers[0]?.id ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customerId, customers, open]);

  function close() {
    onOpenChange(false);
  }

  async function handleParse() {
    if (!receiptFile) {
      toast.error("请先选择客户回传收货单");
      return;
    }
    if (!customerId) {
      toast.error("导入收货记录必须先选择客户");
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadReconciliationFile({ file: receiptFile, fileType: "customer_receipt", customerId });
      setReview(await listParsedReconciliationRecords(uploaded.id));
      toast.success("收货文件解析完成");
    } catch {
      toast.error("上传或解析收货文件失败");
    } finally {
      setBusy(false);
    }
  }

  async function setResolution(recordId: string, resolution: string) {
    if (!review) return;
    try {
      await updateParsedRecordResolution(review.fileId, recordId, resolution);
      setReview(await listParsedReconciliationRecords(review.fileId));
    } catch {
      toast.error("更新处理方式失败");
    }
  }

  async function handleMerge() {
    if (!review) return;
    setBusy(true);
    try {
      const summary = await mergeReconciliationFile(review.fileId);
      toast.success(`合并完成：新增 ${summary.inserted}，跳过 ${summary.skipped}，失败 ${summary.failed}`);
      onMerged();
      close();
      setReceiptFile(null);
      setReview(null);
    } catch {
      toast.error("合并收货文件失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogOverlay open={open} onClose={close}>
      <DialogContent className="recon-import-dialog">
        <DialogHeader>
          <DialogTitle className="recon-dialog-title"><Upload className="h-4 w-4" />上传收货批次</DialogTitle>
          <Button variant="ghost" size="sm" onClick={close}>关闭</Button>
        </DialogHeader>
        <DialogBody className="import-pool-workspace">
          <section className="recon-import-step-panel">
            <div className="recon-import-step-head">
              <div>
                <span className="filter-label">1. 上传文件</span>
                <p className="item-title">先选择客户，再上传本次收货批次</p>
              </div>
              <Button size="sm" disabled={busy || !receiptFile || !customerId} onClick={handleParse}>
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                解析文件
              </Button>
            </div>
            <div className="recon-import-context-row">
              <SearchableFilterSelect
                label="客户"
                value={customerId}
                options={options}
                onChange={(value) => {
                  setCustomerId(value);
                  setReview(null);
                }}
              />
            </div>
            <div className="recon-import-file-row single">
              <label className="recon-import-file-item required">
                <FileSpreadsheet className="h-4 w-4 text-[var(--forvia-blue)]" />
                <div>
                  <strong>客户回传收货单</strong>
                  <span>{receiptFile?.name ?? "客户回传收货单.xlsx"}</span>
                </div>
                <span className="recon-upload-picker">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    aria-label="上传客户回传收货单"
                    onChange={(event) => {
                      setReceiptFile(event.target.files?.[0] ?? null);
                      setReview(null);
                    }}
                  />
                  <span><Upload className="h-3.5 w-3.5" />更换</span>
                </span>
              </label>
            </div>
            <div className="upload-validation-panel preparse-panel">
              <div className="row compact-row">
                <div>
                  <p className="mini-title">解析结果</p>
                  <p className="item-meta">
                    {busy ? "正在上传并解析收货单..." : review ? "系统已按所选客户校验收货单归属，可继续确认入池。" : "等待解析。系统会按所选客户校验收货单归属，并在弹窗内完成去重和冲突确认。"}
                  </p>
                </div>
                <Badge variant={review ? "blue" : "slate"}>{review ? "已解析" : "待解析"}</Badge>
              </div>
            </div>
          </section>

          <section className="pool-section">
            <div className="pool-section-head">
              <div className="pool-section-title">
                <span className="filter-label">2. 入池预览</span>
              </div>
              {review ? (
                <div className="recon-summary-strip">
                  <span>总行数 {review.totalRows}</span>
                  <span>有效 {review.validCount}</span>
                  <span>阻塞 {review.blockedCount}</span>
                  <span>忽略 {review.ignoredCount}</span>
                </div>
              ) : null}
            </div>
            {busy && !review ? (
              <div className="recon-state"><LoaderCircle className="h-4 w-4 animate-spin" /> 正在解析收货批次...</div>
            ) : null}
            {!busy && !review ? (
              <div className="recon-state">请选择客户回传收货单并点击解析文件</div>
            ) : null}
            {review ? (
              <div className="scroll-x recon-import-review">
                <table className="table recon-table import-review-table">
                  <thead>
                    <tr>
                      <th>问题</th>
                      <th>收货日期</th>
                      <th>物料</th>
                      <th>数量</th>
                      <th>交货 / 要货令</th>
                      <th>处理方式</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <div className="stack-tight">
                            <Badge variant={record.validationStatus === "blocked" ? "red" : record.resolution === "skip" ? "slate" : "green"}>
                              {record.issueText ? "需处理" : record.validationStatus === "blocked" ? "阻塞" : "可入池"}
                            </Badge>
                            {record.issueText ? (
                              <span className="recon-issue-text" title={record.issueText}>{record.issueText}</span>
                            ) : null}
                          </div>
                        </td>
                        <td>{receiptPreviewValue(record.normalizedData, ["receiptDate", "receipt_date", "收货日期", "客户收货日期"])}</td>
                        <td>
                          <div className="stack-tight">
                            <strong>{receiptPreviewValue(record.normalizedData, ["internalPartNumber", "internal_part_number", "物料", "物料号", "零件号"])}</strong>
                            <span className="item-meta">第 {record.sourceRowNumber} 行 · {record.recordType}</span>
                          </div>
                        </td>
                        <td>{receiptPreviewValue(record.normalizedData, ["qty", "quantity", "收货数量", "数量"])}</td>
                        <td>
                          <span
                            className="recon-muted-inline"
                            title={normalizedValuePreview(record.normalizedData)}
                          >
                            {receiptPreviewValue(record.normalizedData, ["deliveryNo", "delivery_no", "交货", "交货号"])}
                            {" / "}
                            {receiptPreviewValue(record.normalizedData, ["demandOrderNo", "demand_order_no", "要货令", "交货通知单号"])}
                          </span>
                        </td>
                        <td>
                          <FilterSelect
                            label="方式"
                            value={record.resolution ?? "insert_incremental"}
                            options={importResolutionOptions}
                            onChange={(value) => { void setResolution(record.id, value); }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

        </DialogBody>
        <div className="recon-import-footer">
          <div>
            <span className="filter-label">3. 保存</span>
            <p className="item-title">{saveText}</p>
          </div>
          <Button variant="primary" disabled={busy || !review} onClick={handleMerge}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            合并入池
          </Button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}

function receiptPreviewValue(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return "-";
}
