"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, FileSpreadsheet, LoaderCircle, Save, ScanSearch, Upload } from "lucide-react";
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
import { SearchableFilterSelect } from "@/components/ui/select";
import type { CustomerConfig } from "@/services/settings";
import {
  getReceiptImportReview,
  mergeReconciliationFile,
  uploadReconciliationFile,
  type FileUploadResult,
  type ReceiptImportReview,
  type ReceiptImportReviewRow,
} from "@/services/reconciliation";
import { apiErrorMessage, customerOptions, formatDate, formatQty } from "./reconciliation-utils";

type ReceiptImportDialogProps = {
  open: boolean;
  customers: CustomerConfig[];
  onOpenChange: (open: boolean) => void;
  onMerged: () => void;
};

type ReviewFilter =
  | "all"
  | "strategyImportable"
  | "strategyPendingDemand"
  | "strategyBlocked"
  | "strategySkipped"
  | "orderLinked"
  | "orderMissing"
  | "duplicate"
  | "materialMissing"
  | "zeroQty";

type ReviewFilterOption = {
  key: ReviewFilter;
  label: string;
  count: number;
};

type ReviewFilterGroup = {
  label: string;
  options: ReviewFilterOption[];
};

type IssuePresentation = {
  label: string;
  severity: ReceiptImportReviewRow["issueSeverity"];
  text: string | null;
};

function isSupportedWorkbook(file: File | null) {
  return Boolean(file && /\.xlsx$/i.test(file.name));
}

const duplicateIssueCodes = new Set([
  "DUPLICATE",
  "DUPLICATE_EXACT",
  "DUPLICATE_CHANGED_CONTENT",
  "LOCKED_QTY_CHANGED",
]);

function isDuplicateRow(row: ReceiptImportReviewRow) {
  return duplicateIssueCodes.has(row.issueCode) || row.validationStatus === "ignored" || row.resolution === "skip";
}

function safeIssueText(text: string | null | undefined) {
  if (!text) return null;
  return /[\u4e00-\u9fff]/.test(text) ? text : "该行未通过入池校验，请检查对应字段后重新解析";
}

function issuePresentation(row: ReceiptImportReviewRow): IssuePresentation {
  if (row.issueCode === "DUPLICATE_CHANGED_CONTENT") {
    return {
      label: "重复",
      severity: "red",
      text: "池中已存在同键收货记录，但本次文件内容不同，暂不能入池",
    };
  }
  if (row.issueCode === "LOCKED_QTY_CHANGED") {
    return {
      label: "重复",
      severity: "red",
      text: "池中收货记录已参与对账，且本次文件内容不同，暂不能覆盖",
    };
  }
  if (isDuplicateRow(row)) {
    return {
      label: "重复",
      severity: row.issueSeverity === "red" ? "red" : "amber",
      text: "池中已存在相同收货记录，本行会跳过",
    };
  }
  if (row.issueCode === "ZERO_QTY") {
    return {
      label: "数量为 0",
      severity: "amber",
      text: "收货数量为 0，请确认是否需要入池",
    };
  }
  if (row.issueCode === "UNMAPPED_MATERIAL_RECEIPT") {
    return { label: "物料未维护", severity: "red", text: "客户物料尚未配置内部物料映射，本行暂不能入池" };
  }
  if (row.issueCode === "IMPORTABLE") {
    return { label: "可入池", severity: row.issueSeverity, text: null };
  }
  if (row.issueCode === "BLOCKED") {
    return { label: "需处理", severity: "red", text: safeIssueText(row.issueText) };
  }
  return { label: row.issueLabel || "需处理", severity: row.issueSeverity, text: safeIssueText(row.issueText) };
}

function issueVariant(row: ReceiptImportReviewRow) {
  const presentation = issuePresentation(row);
  if (presentation.severity === "red") return "red";
  if (presentation.severity === "amber") return "amber";
  return "slate";
}

function rowMatchesFilter(row: ReceiptImportReviewRow, filter: ReviewFilter) {
  if (filter === "strategyImportable") return row.importable && Boolean(row.demandOrderNo);
  if (filter === "strategyPendingDemand") return row.importable && !row.demandOrderNo;
  if (filter === "strategyBlocked") return !row.importable && !isDuplicateRow(row);
  if (filter === "strategySkipped") return isDuplicateRow(row);
  if (filter === "orderLinked") return Boolean(row.demandOrderNo);
  if (filter === "orderMissing") return !row.demandOrderNo;
  if (filter === "duplicate") return isDuplicateRow(row);
  if (filter === "materialMissing") return row.issueCode === "UNMAPPED_MATERIAL_RECEIPT";
  if (filter === "zeroQty") return row.issueCode === "ZERO_QTY";
  return true;
}

function importPolicyText(row: ReceiptImportReviewRow) {
  if (isDuplicateRow(row)) return "跳过，不重复入池";
  if (!row.importable) return "暂不入池";
  if (!row.demandOrderNo) return "先入池，待补要货令";
  return "收货逐条入池";
}

function groupCount(group: ReviewFilterGroup) {
  return group.options.reduce((total, option) => total + option.count, 0);
}

export function ReceiptImportDialog({ open, customers, onOpenChange, onMerged }: ReceiptImportDialogProps) {
  const [customerId, setCustomerId] = useState("");
  const [receiptType, setReceiptType] = useState<"internal" | "external">("internal");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUpload, setReceiptUpload] = useState<FileUploadResult | null>(null);
  const [review, setReview] = useState<ReceiptImportReview | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [openFilterGroup, setOpenFilterGroup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const options = useMemo(() => customerOptions(customers, false), [customers]);
  const selectedCustomerName = customers.find((customer) => customer.id === customerId)?.name ?? "";
  const mergeableRows = review?.rows.filter((row) => row.importable).length ?? 0;
  const skippedRows = review?.rows.filter((row) => isDuplicateRow(row)).length ?? 0;
  const blockedRows = review ? review.rows.length - mergeableRows - skippedRows : 0;
  const customerMismatch = Boolean(review?.customerId && customerId && review.customerId !== customerId);
  const saveText = review
    ? `${mergeableRows} 行可入池，${blockedRows} 行暂不入池，${skippedRows} 行跳过`
    : "等待解析结果";

  useEffect(() => {
    if (!open || customerId) return;
    const timer = window.setTimeout(() => {
      setCustomerId(customers[0]?.id ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [customerId, customers, open]);

  function resetReview() {
    setReview(null);
    setReviewFilter("all");
    setOpenFilterGroup(null);
  }

  function close() {
    onOpenChange(false);
    setReceiptType("internal");
    setReceiptFile(null);
    setReceiptUpload(null);
    resetReview();
  }

  async function handleParse() {
    if (!receiptFile) {
      toast.error(receiptType === "external" ? "请先选择外部客户对账单" : "请先选择客户回传收货单");
      return;
    }
    if (!customerId) {
      toast.error("导入收货记录必须先选择客户");
      return;
    }
    if (!isSupportedWorkbook(receiptFile)) {
      toast.error("当前后端解析只支持 .xlsx，请先将文件另存为 .xlsx 后再上传");
      return;
    }
    setBusy(true);
    resetReview();
    try {
      const uploaded = receiptUpload
        ?? await uploadReconciliationFile({ file: receiptFile, fileType: "customer_receipt", customerId, receiptType });
      setReceiptUpload(uploaded);
      const nextReview = await getReceiptImportReview(uploaded.id);
      setReview(nextReview);
      if (nextReview.rows.some((row) => row.importable && row.demandOrderNo)) {
        setReviewFilter("strategyImportable");
      } else if (nextReview.rows.some((row) => row.importable)) {
        setReviewFilter("strategyPendingDemand");
      } else {
        setReviewFilter("strategyBlocked");
      }
      toast.success(`解析完成：${nextReview.validCount}/${nextReview.totalRows} 行可入池`);
    } catch (error) {
      const message = apiErrorMessage(error);
      toast.error(message ? `上传或解析收货文件失败：${message}` : "上传或解析收货文件失败");
    } finally {
      setBusy(false);
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
    } catch (error) {
      const message = apiErrorMessage(error);
      toast.error(message ? `合并收货文件失败：${message}` : "合并收货文件失败");
    } finally {
      setBusy(false);
    }
  }

  const filteredRows = useMemo(
    () => (review ? review.rows.filter((row) => rowMatchesFilter(row, reviewFilter)) : []),
    [review, reviewFilter],
  );
  const filterGroups = useMemo<ReviewFilterGroup[]>(() => {
    const rows = review?.rows ?? [];
    return [
      {
        label: "全部",
        options: [{ key: "all", label: "全部", count: rows.length }],
      },
      {
        label: "要货令",
        options: [
          { key: "orderLinked", label: "已填写", count: rows.filter((row) => rowMatchesFilter(row, "orderLinked")).length },
          { key: "orderMissing", label: "待补", count: rows.filter((row) => rowMatchesFilter(row, "orderMissing")).length },
        ],
      },
      {
        label: "问题",
        options: [
          { key: "duplicate", label: "重复", count: rows.filter((row) => rowMatchesFilter(row, "duplicate")).length },
          { key: "materialMissing", label: "物料未维护", count: rows.filter((row) => rowMatchesFilter(row, "materialMissing")).length },
          { key: "zeroQty", label: "数量为 0", count: rows.filter((row) => rowMatchesFilter(row, "zeroQty")).length },
        ],
      },
      {
        label: "入池建议",
        options: [
          { key: "strategyImportable", label: "可入池", count: rows.filter((row) => rowMatchesFilter(row, "strategyImportable")).length },
          { key: "strategyPendingDemand", label: "先入池待补", count: rows.filter((row) => rowMatchesFilter(row, "strategyPendingDemand")).length },
          { key: "strategyBlocked", label: "暂不入池", count: rows.filter((row) => rowMatchesFilter(row, "strategyBlocked")).length },
          { key: "strategySkipped", label: "跳过", count: rows.filter((row) => rowMatchesFilter(row, "strategySkipped")).length },
        ],
      },
    ];
  }, [review]);

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
                  setReceiptUpload(null);
                  resetReview();
                }}
              />
            </div>
            <div className="recon-receipt-type-group" role="radiogroup" aria-label="收货单类型">
              <label className={`recon-receipt-type-option${receiptType === "internal" ? " active" : ""}`}>
                <input
                  type="radio"
                  name="receiptType"
                  value="internal"
                  checked={receiptType === "internal"}
                  onChange={() => { setReceiptType("internal"); setReceiptUpload(null); resetReview(); }}
                />
                <span className="receipt-type-label">内部客户</span>
                <span className="receipt-type-desc">适用 BYD 等内部客户模版（收货数量 / 物料编码 / 收货日期）</span>
              </label>
              <label className={`recon-receipt-type-option${receiptType === "external" ? " active" : ""}`}>
                <input
                  type="radio"
                  name="receiptType"
                  value="external"
                  checked={receiptType === "external"}
                  onChange={() => { setReceiptType("external"); setReceiptUpload(null); resetReview(); }}
                />
                <span className="receipt-type-label">外部客户</span>
                <span className="receipt-type-desc">适用外部客户对账单模版（物料编码 / 入库数量 / 过帐日期或到货时间）</span>
              </label>
            </div>
            <div className="recon-import-file-row single">
              <label className="recon-import-file-item required">
                <FileSpreadsheet className="h-4 w-4 text-[var(--forvia-blue)]" />
                <div>
                  <strong>{receiptType === "external" ? "外部客户对账单" : "客户回传收货单"}</strong>
                  <span>{receiptFile?.name ?? (receiptType === "external" ? "对账单.xlsx" : "客户回传收货单.xlsx")}</span>
                </div>
                <span className="recon-upload-picker">
                  <input
                    type="file"
                    accept=".xlsx"
                    aria-label={receiptType === "external" ? "上传外部客户对账单" : "上传客户回传收货单"}
                    onChange={(event) => {
                      setReceiptFile(event.target.files?.[0] ?? null);
                      setReceiptUpload(null);
                      resetReview();
                    }}
                  />
                  <span><Upload className="h-3.5 w-3.5" />上传</span>
                </span>
              </label>
            </div>
            <div className="upload-validation-panel preparse-panel">
              <div className="row compact-row">
                <div>
                  <p className="mini-title">解析结果</p>
                  <p className="item-meta">
                    {busy
                      ? "正在上传并解析收货单..."
                      : review
                        ? customerMismatch
                          ? `解析客户为 ${review.customerName ?? review.customerId}，与当前选择的 ${selectedCustomerName || customerId} 不一致，请重新解析`
                          : `系统已按 ${review.customerName ?? (selectedCustomerName || "所选客户")} 校验收货单，可继续确认入池。`
                        : "等待解析。系统会按所选客户校验物料映射，并在弹窗内完成去重和冲突确认。"}
                  </p>
                </div>
                <Badge variant={customerMismatch ? "red" : review ? "blue" : "slate"}>{review ? "已解析" : "待解析"}</Badge>
              </div>
            </div>
          </section>

          <section className="pool-section">
            <div className="pool-section-head">
              <div className="pool-section-title">
                <span className="filter-label">2. 入池预览</span>
              </div>
              {review ? (
                <div className="recon-filter-groups" aria-label="导入结果筛选">
                  {filterGroups.map((group) => {
                    const activeOption = group.options.find((option) => option.key === reviewFilter);
                    const open = openFilterGroup === group.label;
                    return (
                      <div
                        className={`recon-filter-dropdown${activeOption ? " active" : ""}${open ? " open" : ""}`}
                        key={group.label}
                      >
                        <button
                          type="button"
                          className="recon-filter-dropdown-trigger"
                          aria-expanded={open}
                          aria-label={`${group.label}筛选`}
                          onClick={() => setOpenFilterGroup(open ? null : group.label)}
                        >
                          <span className="recon-filter-group-title">{group.label}</span>
                          {activeOption ? (
                            <span className="recon-filter-dropdown-value">{activeOption.label}</span>
                          ) : null}
                          <strong>{activeOption?.count ?? groupCount(group)}</strong>
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        {open ? (
                          <div className="recon-filter-menu" role="group" aria-label={group.label}>
                            {group.options.map((option) => (
                              <button
                                key={option.key}
                                aria-pressed={reviewFilter === option.key}
                                className={`recon-filter-menu-item${reviewFilter === option.key ? " active" : ""}`}
                                type="button"
                                onClick={() => {
                                  setReviewFilter(option.key);
                                  setOpenFilterGroup(null);
                                }}
                              >
                                <span>{option.label}</span>
                                <strong>{option.count}</strong>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
                      <th>收货日期</th>
                      <th>物料</th>
                      <th>数量</th>
                      <th>要货令</th>
                      <th>问题</th>
                      <th>入池策略</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const presentation = issuePresentation(row);
                      return (
                        <tr key={row.parsedRecordId}>
                          <td>{formatDate(row.receiptDate)}</td>
                          <td>
                            <div className="stack-tight">
                              <strong>{row.internalPartNumber ?? "-"}</strong>
                              <span className="item-meta">
                                {row.customerPartNumber ? `客户物料 ${row.customerPartNumber}` : `第 ${row.sourceRowNumber} 行`}
                              </span>
                            </div>
                          </td>
                          <td>{formatQty(row.qty)}</td>
                          <td>
                            <span className="recon-muted-inline">
                              {row.demandOrderNo ?? "未填写"}
                            </span>
                          </td>
                          <td>
                            <div className="stack-tight">
                              <Badge variant={issueVariant(row)} tooltip={presentation.text ?? undefined}>
                                {presentation.label}
                              </Badge>
                              {presentation.text ? <span className="recon-issue-text">{presentation.text}</span> : null}
                            </div>
                          </td>
                          <td>
                            <span className={`recon-import-policy${row.importable ? "" : " blocked"}`}>
                              {importPolicyText(row)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
            <p className="item-title">{saveText}</p>
          </div>
          <Button variant="primary" disabled={busy || !review || customerMismatch} onClick={handleMerge}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {blockedRows > 0 ? "仅合并可入池数据" : "合并入池"}
          </Button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}
