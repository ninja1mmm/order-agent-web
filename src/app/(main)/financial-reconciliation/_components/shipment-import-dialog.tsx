"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Link2, LoaderCircle, Save, ScanSearch, Search, Sheet, Upload } from "lucide-react";
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
import { apiErrorMessage, formatDate, formatQty } from "./reconciliation-utils";

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
  | "strategyImportable"
  | "strategyPendingDemand"
  | "strategyBlocked"
  | "demandLinked"
  | "demandPending"
  | "duplicate"
  | "customerMissing"
  | "materialMissing"
  | "deliveryMissing"
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
  severity: ShipmentImportReviewRow["issueSeverity"];
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

const demandPendingIssueCodes = new Set(["DEMAND_ORDER_UNMAPPED", "DEMAND_ORDER_CONFLICT"]);

function isEffectivelyImportable(row: ShipmentImportReviewRow) {
  return row.importable && row.issueSeverity !== "red" && row.issueCode !== "MISSING_DELIVERY";
}

function isBlockingRow(row: ShipmentImportReviewRow) {
  return row.validationStatus === "blocked" || row.issueSeverity === "red";
}

function safeIssueText(text: string | null | undefined) {
  if (!text) return null;
  return /[\u4e00-\u9fff]/.test(text) ? text : "该行未通过入池校验，请检查对应字段后重新解析";
}

function issuePresentation(row: ShipmentImportReviewRow): IssuePresentation {
  if (row.issueCode === "DUPLICATE_CHANGED_CONTENT") {
    return {
      label: "重复",
      severity: "red",
      text: "池中已存在同键记录，但本次文件内容不同，暂不能入池",
    };
  }
  if (row.issueCode === "LOCKED_QTY_CHANGED") {
    return {
      label: "重复",
      severity: "red",
      text: "池中记录已参与对账，且本次文件内容不同，暂不能覆盖",
    };
  }
  if (duplicateIssueCodes.has(row.issueCode) || row.validationStatus === "ignored" || row.resolution === "skip") {
    return {
      label: "重复",
      severity: row.issueSeverity === "red" ? "red" : "amber",
      text: "池中已存在相同记录，本行会跳过",
    };
  }
  if (row.issueCode === "ZERO_QTY") {
    return {
      label: "数量为 0",
      severity: "amber",
      text: "发运数量为 0，请确认是否需要入池",
    };
  }
  if (row.issueCode === "UNKNOWN_CUSTOMER") {
    return { label: "客户未维护", severity: "red", text: "SAP 客户编码尚未维护，本行暂不能入池" };
  }
  if (row.issueCode === "UNMAPPED_MATERIAL_SHIPMENT") {
    return { label: "物料未维护", severity: "red", text: "发运物料尚未配置客户物料映射，本行暂不能入池" };
  }
  if (row.issueCode === "MISSING_DELIVERY") {
    return { label: "缺少交货", severity: "red", text: "缺少交货编号，本行暂不能入池" };
  }
  if (row.issueCode === "DEMAND_ORDER_UNMAPPED") {
    return { label: "待补要货令", severity: "amber", text: "没有找到对应要货令，可先入池后补充" };
  }
  if (row.issueCode === "DEMAND_ORDER_CONFLICT") {
    return { label: "要货令冲突", severity: "amber", text: "同一交货编号对应多个要货令，请核对映射" };
  }
  if (row.issueCode === "IMPORTABLE") {
    return { label: "可入池", severity: row.issueSeverity, text: null };
  }
  if (row.issueCode === "BLOCKED" || row.issueLabel === "阻塞") {
    return { label: "需处理", severity: row.issueSeverity, text: safeIssueText(row.issueText) };
  }
  return { label: row.issueLabel, severity: row.issueSeverity, text: safeIssueText(row.issueText) };
}

function UploadSlot({ icon, title, fileName, required = false, onFile }: UploadSlotProps) {
  const Icon = icon === "shipment" ? Sheet : Link2;
  return (
    <div className={`recon-import-file-item${required ? " required" : ""}`}>
      <Icon className="h-5 w-5" />
      <div className="min-w-0">
        <strong>{title}</strong>
        <span title={fileName ?? undefined}>{fileName ?? "请选择 .xlsx 文件"}</span>
      </div>
      <label className="recon-upload-picker">
        <input
          type="file"
          accept=".xlsx"
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
  const presentation = issuePresentation(row);
  if (presentation.severity === "red") return "red";
  if (presentation.severity === "amber") return "amber";
  return "slate";
}

function rowMatchesFilter(row: ShipmentImportReviewRow, filter: ReviewFilter) {
  const importable = isEffectivelyImportable(row);
  if (filter === "strategyImportable") return importable && !demandPendingIssueCodes.has(row.issueCode);
  if (filter === "strategyPendingDemand") return importable && demandPendingIssueCodes.has(row.issueCode);
  if (filter === "strategyBlocked") return !importable;
  if (filter === "demandLinked") return Boolean(row.demandOrderNo);
  if (filter === "demandPending") {
    return demandPendingIssueCodes.has(row.issueCode);
  }
  if (filter === "duplicate") return duplicateIssueCodes.has(row.issueCode) || row.validationStatus === "ignored" || row.resolution === "skip";
  if (filter === "customerMissing") return row.issueCode === "UNKNOWN_CUSTOMER";
  if (filter === "materialMissing") return row.issueCode === "UNMAPPED_MATERIAL_SHIPMENT";
  if (filter === "deliveryMissing") return row.issueCode === "MISSING_DELIVERY";
  if (filter === "zeroQty") return row.issueCode === "ZERO_QTY";
  return true;
}

function importPolicyText(row: ShipmentImportReviewRow) {
  if (!isEffectivelyImportable(row)) return "暂不入池";
  if (demandPendingIssueCodes.has(row.issueCode)) {
    return "先入池，待补要货令";
  }
  return "发运逐条入池";
}

function groupCount(group: ReviewFilterGroup) {
  return group.options.reduce((total, option) => total + option.count, 0);
}

export function ShipmentImportDialog({ open, onOpenChange, onMerged }: ShipmentImportDialogProps) {
  const [shipmentFile, setShipmentFile] = useState<File | null>(null);
  const [mappingFile, setMappingFile] = useState<File | null>(null);
  const [shipmentUpload, setShipmentUpload] = useState<FileUploadResult | null>(null);
  const [mappingUpload, setMappingUpload] = useState<FileUploadResult | null>(null);
  const [review, setReview] = useState<ShipmentImportReview | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [openFilterGroup, setOpenFilterGroup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setShipmentFile(null);
    setMappingFile(null);
    setShipmentUpload(null);
    setMappingUpload(null);
    setReview(null);
    setReviewFilter("all");
    setCustomerFilter("all");
    setCustomerSearch("");
    setOpenFilterGroup(null);
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
    if (!isSupportedWorkbook(shipmentFile) || !isSupportedWorkbook(mappingFile)) {
      toast.error("当前后端解析只支持 .xlsx，请先将文件另存为 .xlsx 后再上传");
      return;
    }
    setBusy(true);
    setReview(null);
    try {
      const [shipmentOutcome, mappingOutcome] = await Promise.allSettled([
        shipmentUpload
          ? Promise.resolve(shipmentUpload)
          : uploadReconciliationFile({ file: shipmentFile, fileType: "sap_shipment" }),
        mappingUpload
          ? Promise.resolve(mappingUpload)
          : uploadReconciliationFile({ file: mappingFile, fileType: "delivery_mapping" }),
      ]);

      if (shipmentOutcome.status === "fulfilled") setShipmentUpload(shipmentOutcome.value);
      if (mappingOutcome.status === "fulfilled") setMappingUpload(mappingOutcome.value);
      if (shipmentOutcome.status === "rejected") throw shipmentOutcome.reason;
      if (mappingOutcome.status === "rejected") throw mappingOutcome.reason;

      const shipmentResult = shipmentOutcome.value;
      const mappingResult = mappingOutcome.value;
      setShipmentUpload(shipmentResult);
      setMappingUpload(mappingResult);
      const nextReview = await refreshReview(shipmentResult.id, mappingResult.id);
      setReviewFilter(nextReview.rows.some(isEffectivelyImportable) ? "strategyImportable" : "strategyBlocked");
      toast.success(`解析完成：${nextReview.linkedCount}/${nextReview.totalRows} 行已关联要货令`);
    } catch (error) {
      const message = apiErrorMessage(error);
      toast.error(message ? `上传或解析发运批次失败：${message}` : "上传或解析发运批次失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleMerge() {
    if (!review) return;
    if (!review.rows.some(isEffectivelyImportable)) {
      toast.error("当前批次没有可入池数据，请先处理红色问题后重新解析");
      return;
    }
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
    } catch (error) {
      const message = apiErrorMessage(error);
      toast.error(message ? `合并发运批次失败：${message}` : "合并发运批次失败");
    } finally {
      setBusy(false);
    }
  }

  const parsedReview = shipmentUpload && mappingUpload ? review : null;
  const customerSummary = parsedReview?.customerResolutionSummary ?? null;
  const unresolvedCustomers = customerSummary?.customers.filter((item) => !item.resolved) ?? [];
  const hasUnresolvedCustomers = unresolvedCustomers.length > 0;
  const mergeableRows = parsedReview?.rows.filter(isEffectivelyImportable).length ?? 0;
  const blockedRows = parsedReview ? parsedReview.rows.length - mergeableRows : 0;
  const blockingRows = parsedReview?.rows.filter(isBlockingRow) ?? [];
  const hasBlockingRows = blockingRows.length > 0;
  const saveText = parsedReview
    ? hasBlockingRows
      ? `${mergeableRows} 行可入池，${blockingRows.length} 行红色问题将排除；可先合并有效数据，问题数据维护后重新解析`
      : `${mergeableRows} 行可入池，${blockedRows} 行暂不入池；${parsedReview.linkedCount} 行已关联要货令，${parsedReview.missingMappingCount} 行待补要货令`
    : "解析后在弹窗内完成去重和冲突确认";
  const filteredRows = useMemo(
    () => (review
      ? review.rows.filter((row) => (
          rowMatchesFilter(row, reviewFilter)
          && (customerFilter === "all" || (row.sapCustomerCode ?? "未填客户码") === customerFilter)
        ))
      : []),
    [customerFilter, review, reviewFilter],
  );
  const customerFilterOptions = useMemo(() => {
    const rows = review?.rows ?? [];
    const counts = new Map<string, { label: string; count: number }>();
    for (const row of rows) {
      const code = row.sapCustomerCode ?? "未填客户码";
      const name = row.resolvedCustomerName ?? row.sapCustomerName;
      const current = counts.get(code) ?? { label: name ? `${code} · ${name}` : code, count: 0 };
      current.count += 1;
      counts.set(code, current);
    }
    return [
      { key: "all", label: "全部客户", count: rows.length },
      ...Array.from(counts.entries())
        .map(([key, value]) => ({ key, label: value.label, count: value.count }))
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "zh-CN")),
    ];
  }, [review]);
  const selectedCustomerOption = customerFilterOptions.find((option) => option.key === customerFilter);
  const visibleCustomerFilterOptions = useMemo(() => {
    const term = customerSearch.trim().toLocaleLowerCase("zh-CN");
    if (!term) return customerFilterOptions;
    return customerFilterOptions.filter((option) => (
      option.key === "all"
      || option.key.toLocaleLowerCase("zh-CN").includes(term)
      || option.label.toLocaleLowerCase("zh-CN").includes(term)
    ));
  }, [customerFilterOptions, customerSearch]);
  const filterGroups = useMemo<ReviewFilterGroup[]>(() => {
    const rows = review?.rows ?? [];
    const linked = rows.filter((row) => row.demandOrderNo).length;
    return [
      {
        label: "要货令映射",
        options: [
          { key: "demandLinked", label: "已关联", count: linked },
          { key: "demandPending", label: "待补", count: rows.filter((row) => rowMatchesFilter(row, "demandPending")).length },
        ],
      },
      {
        label: "问题",
        options: [
          { key: "duplicate", label: "重复", count: rows.filter((row) => rowMatchesFilter(row, "duplicate")).length },
          { key: "customerMissing", label: "客户未维护", count: rows.filter((row) => rowMatchesFilter(row, "customerMissing")).length },
          { key: "materialMissing", label: "物料未维护", count: rows.filter((row) => rowMatchesFilter(row, "materialMissing")).length },
          { key: "deliveryMissing", label: "缺少交货", count: rows.filter((row) => rowMatchesFilter(row, "deliveryMissing")).length },
          { key: "zeroQty", label: "数量为 0", count: rows.filter((row) => rowMatchesFilter(row, "zeroQty")).length },
        ],
      },
      {
        label: "入池建议",
        options: [
          { key: "strategyImportable", label: "可入池", count: rows.filter((row) => rowMatchesFilter(row, "strategyImportable")).length },
          { key: "strategyPendingDemand", label: "先入池待补", count: rows.filter((row) => rowMatchesFilter(row, "strategyPendingDemand")).length },
          { key: "strategyBlocked", label: "暂不入池", count: rows.filter((row) => rowMatchesFilter(row, "strategyBlocked")).length },
        ],
      },
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
                          {customerSummary.unresolvedRowCount} 行发运记录不会入池。可先合并其他有效数据，维护客户信息后再重新解析问题数据。
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
                <div className="recon-filter-groups" aria-label="导入结果筛选">
                  <div className={`recon-filter-dropdown${customerFilter !== "all" ? " active" : ""}${openFilterGroup === "客户" ? " open" : ""}`}>
                    <button
                      type="button"
                      className="recon-filter-dropdown-trigger"
                      aria-expanded={openFilterGroup === "客户"}
                      aria-label="客户筛选"
                      onClick={() => {
                        const nextOpen = openFilterGroup !== "客户";
                        setOpenFilterGroup(nextOpen ? "客户" : null);
                        if (!nextOpen) setCustomerSearch("");
                      }}
                    >
                      <span className="recon-filter-group-title">客户</span>
                      <span className="recon-filter-dropdown-value">
                        {selectedCustomerOption?.label ?? "全部客户"}
                      </span>
                      <strong>{selectedCustomerOption?.count ?? 0}</strong>
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    {openFilterGroup === "客户" ? (
                      <div className="recon-filter-menu recon-filter-menu-wide" role="group" aria-label="客户">
                        <label className="recon-filter-menu-search">
                          <Search className="h-3.5 w-3.5" aria-hidden="true" />
                          <input
                            type="search"
                            value={customerSearch}
                            onChange={(event) => setCustomerSearch(event.target.value)}
                            placeholder="搜索客户编码或名称"
                            aria-label="搜索客户"
                            autoFocus
                          />
                        </label>
                        <div className="recon-filter-menu-list">
                          {visibleCustomerFilterOptions.map((option) => (
                            <button
                              key={option.key}
                              aria-pressed={customerFilter === option.key}
                              className={`recon-filter-menu-item${customerFilter === option.key ? " active" : ""}`}
                              type="button"
                              onClick={() => {
                                setCustomerFilter(option.key);
                                setCustomerSearch("");
                                setOpenFilterGroup(null);
                              }}
                            >
                              <span>{option.label}</span>
                              <strong>{option.count}</strong>
                            </button>
                          ))}
                          {visibleCustomerFilterOptions.length === 0 ? (
                            <div className="recon-filter-menu-empty">没有匹配客户</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
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
                            <div className="recon-filter-menu-list">
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
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
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
                      <th>发运日期</th>
                      <th>SAP 客户</th>
                      <th>物料</th>
                      <th>数量</th>
                      <th>要货令映射</th>
                      <th>问题</th>
                      <th>入池策略</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const presentation = issuePresentation(row);
                      return (
                        <tr key={row.parsedRecordId}>
                          <td>{formatDate(row.shipmentDate)}</td>
                          <td>
                            <div className="stack-tight">
                              <strong>{row.sapCustomerCode ?? "-"}</strong>
                              {(row.resolvedCustomerName ?? row.sapCustomerName) ? (
                                <span className="item-meta">{row.resolvedCustomerName ?? row.sapCustomerName}</span>
                              ) : null}
                            </div>
                          </td>
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
                            <div className="stack-tight">
                              <Badge variant={issueVariant(row)} title={presentation.text ?? undefined}>
                                {presentation.label}
                              </Badge>
                              {presentation.text ? <span className="recon-issue-text">{presentation.text}</span> : null}
                            </div>
                          </td>
                          <td>
                            <span className={`recon-import-policy${isEffectivelyImportable(row) ? "" : " blocked"}`}>
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
            <p className="item-title">
              {review
                ? `${blockedRows} 行不能入池`
                : "等待解析结果"}
            </p>
          </div>
          <Button variant="primary" disabled={busy || !review || mergeableRows === 0} onClick={handleMerge}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mergeableRows === 0
              ? "没有可入池数据"
              : hasBlockingRows
                ? "合并可入池数据"
                : "合并入池"}
          </Button>
        </div>
      </DialogContent>
    </DialogOverlay>
  );
}
