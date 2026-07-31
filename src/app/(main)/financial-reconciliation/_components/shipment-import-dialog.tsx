"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Link2, LoaderCircle, Save, ScanSearch, Sheet, Upload } from "lucide-react";
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
import {
  getShipmentImportReview,
  mergeReconciliationFile,
  uploadReconciliationFile,
  type FileUploadResult,
  type ShipmentImportReview,
  type ShipmentImportReviewRow,
} from "@/services/reconciliation";
import { formatDate, formatQty } from "./reconciliation-utils";

type ShipmentImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
};

type UploadSlotProps = {
  icon: "shipment" | "mapping";
  title: string;
  fileName: string | null;
  required?: boolean;
  onFile: (file: File | null) => void;
};

type ReviewFilter =
  | "all"
  | "importable"
  | "demandLinked"
  | "demandPending"
  | "customerMissing"
  | "materialMissing"
  | "blocked";

function UploadSlot({ icon, title, fileName, required = false, onFile }: UploadSlotProps) {
  const Icon = icon === "shipment" ? Sheet : Link2;
  return (
    <div className={`recon-import-file-item${required ? " required" : ""}`}>
      <Icon className="h-5 w-5" />
      <div className="min-w-0">
        <strong>{title}</strong>
        <span title={fileName ?? undefined}>{fileName ?? "请选择 .xlsx / .xls 文件"}</span>
      </div>
      <label className="recon-upload-picker">
        <input
          type="file"
          accept=".xlsx,.xls"
          required={required}
          aria-label={`上传${title}`}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
        <span><Upload className="h-3.5 w-3.5" />{fileName ? "更换" : "选择"}</span>
      </label>
    </div>
  );
}

function issueVariant(row: ShipmentImportReviewRow) {
  if (row.issueSeverity === "red") return "red";
  if (row.issueSeverity === "amber") return "amber";
  return "slate";
}

function rowMatchesFilter(row: ShipmentImportReviewRow, filter: ReviewFilter) {
  if (filter === "importable") return row.importable;
  if (filter === "demandLinked") return Boolean(row.demandOrderNo);
  if (filter === "demandPending") {
    return row.issueCode === "DEMAND_ORDER_UNMAPPED" || row.issueCode === "DEMAND_ORDER_CONFLICT";
  }
  if (filter === "customerMissing") return row.issueCode === "UNKNOWN_CUSTOMER";
  if (filter === "materialMissing") return row.issueCode === "UNMAPPED_MATERIAL_SHIPMENT";
  if (filter === "blocked") return !row.importable;
  return true;
}

function importPolicyText(row: ShipmentImportReviewRow) {
  if (!row.importable) return "暂不入池";
  if (row.issueCode === "DEMAND_ORDER_UNMAPPED" || row.issueCode === "DEMAND_ORDER_CONFLICT") {
    return "先入池，待补要货令";
  }
  return "发运逐条入池";
}

export function ShipmentImportDialog({ open, onOpenChange, onMerged }: ShipmentImportDialogProps) {
  const [shipmentFile, setShipmentFile] = useState<File | null>(null);
  const [mappingFile, setMappingFile] = useState<File | null>(null);
  const [shipmentUpload, setShipmentUpload] = useState<FileUploadResult | null>(null);
  const [mappingUpload, setMappingUpload] = useState<FileUploadResult | null>(null);
  const [review, setReview] = useState<ShipmentImportReview | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [busy, setBusy] = useState(false);

  function reset() {
    setShipmentFile(null);
    setMappingFile(null);
    setShipmentUpload(null);
    setMappingUpload(null);
    setReview(null);
    setReviewFilter("all");
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  async function refreshReview(shipmentFileId: string, mappingFileId: string) {
    const nextReview = await getShipmentImportReview({ shipmentFileId, mappingFileId });
    setReview(nextReview);
    return nextReview;
  }

  async function handleParse() {
    if (!shipmentFile || !mappingFile) {
      toast.error("请先选择 SAP 发运记录和交货-要货令映射表");
      return;
    }
    setBusy(true);
    setReview(null);
    try {
      const [shipmentResult, mappingResult] = await Promise.all([
        uploadReconciliationFile({ file: shipmentFile, fileType: "sap_shipment" }),
        uploadReconciliationFile({ file: mappingFile, fileType: "delivery_mapping" }),
      ]);
      setShipmentUpload(shipmentResult);
      setMappingUpload(mappingResult);
      const nextReview = await refreshReview(shipmentResult.id, mappingResult.id);
      setReviewFilter(nextReview.rows.some((row) => row.importable) ? "importable" : "blocked");
      toast.success(`解析完成：${nextReview.linkedCount}/${nextReview.totalRows} 行已关联要货令`);
    } catch {
      toast.error("上传或解析发运批次失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleMerge() {
    if (!review) return;
    setBusy(true);
    try {
      const mappingSummary = await mergeReconciliationFile(review.mappingFileId);
      const shipmentSummary = await mergeReconciliationFile(review.shipmentFileId);
      const inserted = mappingSummary.inserted + shipmentSummary.inserted;
      const skipped = mappingSummary.skipped + shipmentSummary.skipped;
      const failed = mappingSummary.failed + shipmentSummary.failed;
      const enriched = mappingSummary.enriched + shipmentSummary.enriched;
      toast.success(`合并完成：新增 ${inserted}，跳过 ${skipped}，失败 ${failed}，关联 ${enriched}`);
      onMerged();
      close();
    } catch {
      toast.error("合并发运批次失败");
    } finally {
      setBusy(false);
    }
  }

  const parsedReview = shipmentUpload && mappingUpload ? review : null;
  const customerSummary = parsedReview?.customerResolutionSummary ?? null;
  const unresolvedCustomers = customerSummary?.customers.filter((item) => !item.resolved) ?? [];
  const hasUnresolvedCustomers = unresolvedCustomers.length > 0;
  const mergeableRows = parsedReview?.rows.filter((row) => row.validationStatus === "valid").length ?? 0;
  const blockedRows = parsedReview ? parsedReview.rows.length - mergeableRows : 0;
  const saveText = parsedReview
    ? `${mergeableRows} 行可入池，${blockedRows} 行暂不入池；${parsedReview.linkedCount} 行已关联要货令，${parsedReview.missingMappingCount} 行待补要货令`
    : "解析后在弹窗内完成去重和冲突确认";
  const filteredRows = useMemo(
    () => (review ? review.rows.filter((row) => rowMatchesFilter(row, reviewFilter)) : []),
    [review, reviewFilter],
  );
  const filterOptions = useMemo(() => {
    const rows = review?.rows ?? [];
    const linked = rows.filter((row) => row.demandOrderNo).length;
    return [
      { key: "all" as const, label: "全部", count: rows.length },
      { key: "importable" as const, label: "可入池", count: rows.filter((row) => row.importable).length },
      { key: "blocked" as const, label: "不可入池", count: rows.filter((row) => rowMatchesFilter(row, "blocked")).length },
      { key: "demandLinked" as const, label: "要货令已关联", count: linked },
      { key: "demandPending" as const, label: "待补要货令", count: rows.filter((row) => rowMatchesFilter(row, "demandPending")).length },
      { key: "customerMissing" as const, label: "客户未维护", count: rows.filter((row) => rowMatchesFilter(row, "customerMissing")).length },
      { key: "materialMissing" as const, label: "物料未维护", count: rows.filter((row) => rowMatchesFilter(row, "materialMissing")).length },
    ];
  }, [review]);

  return (
    <DialogOverlay open={open} onClose={close}>
      <DialogContent className="recon-import-dialog">
        <DialogHeader>
          <DialogTitle className="recon-dialog-title"><Upload className="h-4 w-4" />上传发运批次</DialogTitle>
          <Button variant="ghost" size="sm" onClick={close}>关闭</Button>
        </DialogHeader>
        <DialogBody className="import-pool-workspace">
          <section className="recon-import-step-panel">
            <div className="recon-import-step-head">
              <div>
                <span className="filter-label">1. 上传文件</span>
                <p className="item-title">本次批次先进入入池前结果</p>
              </div>
              <Button size="sm" disabled={busy} onClick={handleParse}>
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                解析文件
              </Button>
            </div>
            <div className="recon-import-file-row">
              <UploadSlot
                icon="shipment"
                title="SAP 发运记录"
                fileName={shipmentFile?.name ?? shipmentUpload?.fileName ?? null}
                required
                onFile={(file) => {
                  setShipmentFile(file);
                  setShipmentUpload(null);
                  setReview(null);
                }}
              />
              <UploadSlot
                icon="mapping"
                title="交货-要货令映射"
                fileName={mappingFile?.name ?? mappingUpload?.fileName ?? null}
                required
                onFile={(file) => {
                  setMappingFile(file);
                  setMappingUpload(null);
                  setReview(null);
                }}
              />
            </div>
            <div className="upload-validation-panel preparse-panel">
              <div className="row compact-row">
                <div>
                  <p className="mini-title">解析结果</p>
                  <p className="item-meta">{busy ? "正在上传并解析两张表..." : saveText}</p>
                </div>
                <Badge variant={parsedReview ? "blue" : "slate"}>
                  {parsedReview ? "已解析" : "待解析"}
                </Badge>
              </div>
              {customerSummary ? (
                <div className={`shipment-customer-summary${hasUnresolvedCustomers ? " has-warning" : ""}`}>
                  <div className="shipment-summary-metrics">
                    <span><strong>{customerSummary.totalCustomerCodes}</strong> 个 SAP 客户码</span>
                    <span><strong>{customerSummary.resolvedCustomerCodes}</strong> 个已维护</span>
                    <span><strong>{customerSummary.unresolvedCustomerCodes}</strong> 个未维护</span>
                    <span><strong>{customerSummary.resolvedRowCount}</strong> 行已识别客户</span>
                  </div>
                  {hasUnresolvedCustomers ? (
                    <div className="shipment-customer-warning">
                      <div>
                        <strong>部分客户没有找到</strong>
                        <p>
                          {customerSummary.unresolvedRowCount} 行发运记录会暂不入池。可先合并已维护客户且校验通过的数据，未维护客户补齐后重新解析导入。
                        </p>
                      </div>
                      <Button size="sm" onClick={() => window.open("/system-settings", "_blank", "noopener,noreferrer")}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        维护客户信息
                      </Button>
                    </div>
                  ) : (
                    <p className="shipment-customer-ok">客户信息已全部匹配，可继续合并入池。</p>
                  )}
                  {hasUnresolvedCustomers ? (
                    <div className="shipment-unresolved-list" aria-label="未维护 SAP 客户码">
                      {unresolvedCustomers.slice(0, 6).map((item) => (
                        <span key={item.sapCustomerCode} title={item.sapCustomerName ?? undefined}>
                          {item.sapCustomerCode}
                          <strong>{item.rowCount} 行</strong>
                        </span>
                      ))}
                      {unresolvedCustomers.length > 6 ? <span>另 {unresolvedCustomers.length - 6} 个</span> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="pool-section">
            <div className="pool-section-head">
              <div className="pool-section-title">
                <span className="filter-label">2. 入池预览</span>
              </div>
              {review ? (
                <div className="recon-filter-strip" aria-label="导入结果筛选" role="group">
                  {filterOptions.map((option) => (
                    <button
                      key={option.key}
                      aria-pressed={reviewFilter === option.key}
                      className={`recon-filter-badge${reviewFilter === option.key ? " active" : ""}`}
                      type="button"
                      onClick={() => setReviewFilter(option.key)}
                    >
                      <span>{option.label}</span>
                      <strong>{option.count}</strong>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {busy && !review ? (
              <div className="recon-state"><LoaderCircle className="h-4 w-4 animate-spin" /> 正在解析发运批次...</div>
            ) : null}
            {!busy && !review ? (
              <div className="recon-state">请选择两张表并点击解析文件</div>
            ) : null}
            {review ? (
              <div className="scroll-x recon-import-review">
                <table className="table recon-table import-review-table">
                  <thead>
                    <tr>
                      <th>问题</th>
                      <th>发运日期</th>
                      <th>物料</th>
                      <th>数量</th>
                      <th>交货 / 要货令</th>
                      <th>入池策略</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.parsedRecordId}>
                        <td>
                          <div className="stack-tight">
                            <Badge variant={issueVariant(row)} title={row.issueText ?? undefined}>
                              {row.issueLabel}
                            </Badge>
                            {row.issueText ? <span className="recon-issue-text">{row.issueText}</span> : null}
                          </div>
                        </td>
                        <td>{formatDate(row.shipmentDate)}</td>
                        <td>
                          <div className="stack-tight">
                            <strong>{row.internalPartNumber ?? "-"}</strong>
                            {row.materialName ? <span className="item-meta">{row.materialName}</span> : null}
                          </div>
                        </td>
                        <td>{formatQty(row.qty)}</td>
                        <td>
                          <span className="recon-muted-inline">
                            {row.deliveryNo ?? "-"} / {row.demandOrderNo ?? "未关联"}
                          </span>
                        </td>
                        <td>
                          <span className={`recon-import-policy${row.importable ? "" : " blocked"}`}>
                            {importPolicyText(row)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRows.length === 0 ? <div className="recon-state inline">当前筛选没有待处理行</div> : null}
              </div>
            ) : null}
          </section>

        </DialogBody>
        <div className="recon-import-footer">
          <div>
            <span className="filter-label">3. 保存</span>
            <p className="item-title">
              {review
                ? hasUnresolvedCustomers
                  ? `${mergeableRows} 行当前可入池，${customerSummary?.unresolvedRowCount ?? 0} 行未维护客户暂不入池`
                  : `${review.totalRows} 行发运逐条入池，映射表按交货号合并后补充要货令`
                : "等待解析结果"}
            </p>
          </div>
          <Button variant="primary" disabled={busy || !review} onClick={handleMerge}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {hasUnresolvedCustomers ? "仅合并可入池数据" : "合并入池"}
          </Button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}
