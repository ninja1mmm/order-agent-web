import type { CustomerConfig } from "@/types/models/settings";
import type {
  CommitPreviewRow,
  FileUploadResult,
  MatchDetailRow,
  MatchGroup,
  MatchList,
  MatchSummary,
  MergeReview,
  MergeSummary,
  ReceiptImportReview,
  ReceiptRecord,
  ReconciliationConfigRow,
  ReconciliationMatch,
  ReconciliationSchedule,
  ReconciliationTask,
  ReconciliationTaskList,
  ShipmentImportReview,
  ShipmentRecord,
} from "@/types/models/reconciliation";
import type {
  MatchListResponseSchema,
  MatchSummaryResponseSchema,
  MergeReviewResponseSchema,
  MergeSummaryResponseSchema,
  ReceiptImportReviewResponseSchema,
  ReceiptRecordListResponseSchema,
  ReceiptRecordResponseSchema,
  ReconciliationFileUploadResponseSchema,
  ReconciliationScheduleResponseSchema,
  ReconciliationTaskListResponseSchema,
  ReconciliationTaskResponseSchema,
  ShipmentImportReviewResponseSchema,
  ShipmentRecordListResponseSchema,
  ShipmentRecordResponseSchema,
} from "@/types/schemas/reconciliation";

type Variant = "blue" | "green" | "amber" | "red" | "slate";

type MatchGroupAccumulator = MatchGroup & {
  shipmentIds: Set<string>;
  receiptIds: Set<string>;
  matchedShipmentIds: Set<string>;
  matchedReceiptIds: Set<string>;
};

function customerName(customers: CustomerConfig[], customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name || customerId;
}

function periodLabel(from: string, to: string) {
  return `${from} - ${to}`;
}

export function reconciliationTaskStatusMeta(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    draft: { label: "待开始", variant: "slate" },
    in_progress: { label: "对账中", variant: "blue" },
    closed: { label: "已关闭", variant: "green" },
    voided: { label: "已作废", variant: "slate" },
    cancelled: { label: "已取消", variant: "slate" },
  };
  return map[status] ?? { label: status || "未知", variant: "slate" };
}

export function reconciliationRecordStatusMeta(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    unmatched: { label: "未匹配", variant: "slate" },
    partial_confirmed_pending_writeback: { label: "部分确认待写回", variant: "amber" },
    confirmed_pending_writeback: { label: "已确认待写回", variant: "blue" },
    partial: { label: "部分匹配", variant: "amber" },
    fully_matched: { label: "完全匹配", variant: "green" },
  };
  return map[status] ?? { label: status || "未知", variant: "slate" };
}

export function reconciliationMatchStatusMeta(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    candidate: { label: "待确认", variant: "amber" },
    confirmed: { label: "已确认", variant: "green" },
    rejected: { label: "已拒绝", variant: "red" },
  };
  return map[status] ?? { label: status || "未知", variant: "slate" };
}

export function reconciliationMatchMethodLabel(method: string): string {
  if (!method) return "-";
  if (method === "user_remapped_receipt") return "人工调整收货对应";
  if (method === "user_cleared_receipt") return "人工移出收货";
  if (method === "user_created") return "人工创建匹配";
  if (method === "未生成候选") return "未生成候选";
  if (method.startsWith("demand_order_no=") && method.includes("DATE_ANOMALY")) return "要货令匹配，日期异常";
  if (method.startsWith("demand_order_no=")) return "要货令匹配";
  if (method.startsWith("exact_qty=")) {
    const gap = method.match(/date_gap=([-\d]+)d/)?.[1];
    return gap == null ? "数量完全一致" : `数量完全一致，日期相差 ${gap} 天`;
  }
  if (method.startsWith("N_recv:1_ship")) return "多笔收货对应一笔发运";
  if (method.startsWith("1_recv:N_ship")) return "一笔收货对应多笔发运";
  if (method.startsWith("date_proximity")) {
    const gap = method.match(/gap=([-\d]+)d/)?.[1];
    return gap == null ? "日期邻近匹配" : `日期邻近匹配，相差 ${gap} 天`;
  }
  return method;
}

export function transformTaskSchemaToModel(
  task: ReconciliationTaskResponseSchema,
  customers: CustomerConfig[],
): ReconciliationTask {
  const meta = reconciliationTaskStatusMeta(task.status);
  return {
    id: task.id,
    taskNo: task.taskNo,
    customerId: task.customerId,
    customerName: customerName(customers, task.customerId),
    periodFrom: task.periodFrom,
    periodTo: task.periodTo,
    periodLabel: periodLabel(task.periodFrom, task.periodTo),
    status: task.status,
    isTransitioning: task.isTransitioning,
    statusLabel: meta.label,
    statusVariant: meta.variant,
    creationSource: task.creationSource,
    totalRecordCount: task.totalRecordCount ?? 0,
    matchedRecordCount: task.matchedRecordCount ?? 0,
    exceptionRecordCount: task.exceptionRecordCount ?? 0,
    remark: task.remark,
    createdBy: task.createdBy,
    closedBy: task.closedBy,
    reopenedAt: task.reopenedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    closedAt: task.closedAt,
    voidReason: task.voidReason,
  };
}

export function transformTaskListSchemaToModel(
  response: ReconciliationTaskListResponseSchema,
  customers: CustomerConfig[],
): ReconciliationTaskList {
  return {
    ...response,
    tasks: response.tasks.map((task) => transformTaskSchemaToModel(task, customers)),
  };
}

export function transformScheduleSchemaToModel(
  schedule: ReconciliationScheduleResponseSchema,
): ReconciliationSchedule {
  const isWeekly = schedule.periodType === "weekly";
  const periodText = isWeekly
    ? `每周 ${schedule.periodStartDay} - ${schedule.periodEndDay ?? schedule.periodStartDay}`
    : `上月 ${schedule.periodStartDay} 日 - ${schedule.periodEndDay ? `本月 ${schedule.periodEndDay} 日` : "本月末日"}`;
  const triggerText = isWeekly
    ? `周 ${schedule.triggerDay} ${schedule.triggerTime}`
    : `每月 ${schedule.triggerDay} 日 ${schedule.triggerTime}`;

  return {
    ...schedule,
    periodLabel: periodText,
    triggerLabel: triggerText,
  };
}

export function buildConfigRows(
  customers: CustomerConfig[],
  schedulesByCustomer: Record<string, ReconciliationScheduleResponseSchema[]>,
): ReconciliationConfigRow[] {
  return customers.flatMap<ReconciliationConfigRow>((customer) => {
    const schedules = schedulesByCustomer[customer.id] ?? [];
    if (schedules.length === 0) {
      return [{
        key: `${customer.id}:empty`,
        customer,
        customerName: customer.name || customer.id,
        schedule: null,
        configured: false,
      }];
    }
    return schedules.map((schedule) => ({
      key: `${customer.id}:${schedule.scheduleId}`,
      customer,
      customerName: customer.name || customer.id,
      schedule: transformScheduleSchemaToModel(schedule),
      configured: true,
    }));
  });
}

export function transformShipmentSchemaToModel(
  record: ShipmentRecordResponseSchema,
  customers: CustomerConfig[],
): ShipmentRecord {
  const meta = reconciliationRecordStatusMeta(record.effectiveReconciliationStatus);
  const activeConfirmedMatchCount = record.activeConfirmedMatchCount ?? 0;
  const remainingQty = record.qty - record.matchedReceiptQty;
  return {
    id: record.id,
    customerId: record.customerId,
    customerName: customerName(customers, record.customerId),
    sapCustomerCode: record.sapCustomerCode,
    internalPartNumber: record.internalPartNumber,
    materialName: record.materialName,
    qty: record.qty,
    shipmentDate: record.shipmentDate,
    deliveryNo: record.deliveryNo,
    demandOrderNo: record.demandOrderNo,
    materialDocNo: record.materialDocNo,
    adjustmentSeq: record.adjustmentSeq,
    matchedReceiptQty: record.matchedReceiptQty,
    pendingMatchedReceiptQty: record.pendingMatchedReceiptQty ?? 0,
    activeConfirmedMatchCount,
    remainingQty,
    reconciliationStatus: record.reconciliationStatus,
    effectiveReconciliationStatus: record.effectiveReconciliationStatus,
    reconciliationStatusLabel: meta.label,
    statusVariant: meta.variant,
    locked: record.effectiveReconciliationStatus !== "unmatched",
    remark: record.remark,
    lastReconciledTaskId: record.lastReconciledTaskId,
    status: record.status,
    sourceFileId: record.sourceFileId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function transformShipmentListSchemaToModel(
  response: ShipmentRecordListResponseSchema,
  customers: CustomerConfig[],
) {
  return {
    ...response,
    records: response.records.map((record) => transformShipmentSchemaToModel(record, customers)),
  };
}

export function transformReceiptSchemaToModel(
  record: ReceiptRecordResponseSchema,
  customers: CustomerConfig[],
): ReceiptRecord {
  const meta = reconciliationRecordStatusMeta(record.effectiveReconciliationStatus);
  const activeConfirmedMatchCount = record.activeConfirmedMatchCount ?? 0;
  const remainingQty = record.qty - record.matchedShipmentQty;
  return {
    id: record.id,
    customerId: record.customerId,
    customerName: customerName(customers, record.customerId),
    customerType: record.customerType,
    internalPartNumber: record.internalPartNumber,
    materialName: record.materialName,
    qty: record.qty,
    receiptDate: record.receiptDate,
    demandOrderNo: record.demandOrderNo,
    adjustmentSeq: record.adjustmentSeq,
    matchedShipmentQty: record.matchedShipmentQty,
    pendingMatchedShipmentQty: record.pendingMatchedShipmentQty ?? 0,
    activeConfirmedMatchCount,
    remainingQty,
    reconciliationStatus: record.reconciliationStatus,
    effectiveReconciliationStatus: record.effectiveReconciliationStatus,
    reconciliationStatusLabel: meta.label,
    statusVariant: meta.variant,
    locked: record.effectiveReconciliationStatus !== "unmatched",
    remark: record.remark,
    lastReconciledTaskId: record.lastReconciledTaskId,
    status: record.status,
    sourceFileId: record.sourceFileId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function transformReceiptListSchemaToModel(
  response: ReceiptRecordListResponseSchema,
  customers: CustomerConfig[],
) {
  return {
    ...response,
    records: response.records.map((record) => transformReceiptSchemaToModel(record, customers)),
  };
}

export function transformMergeReviewToModel(response: MergeReviewResponseSchema): MergeReview {
  return {
    ...response,
    records: response.records.map((record) => ({
      ...record,
      issueText: record.validationIssues
        .map((issue) => String(issue.message ?? issue.field ?? JSON.stringify(issue)))
        .join("; "),
    })),
  };
}

export function transformFileUploadToModel(
  response: ReconciliationFileUploadResponseSchema,
): FileUploadResult {
  return response;
}

export function transformMergeSummaryToModel(response: MergeSummaryResponseSchema): MergeSummary {
  return response;
}

export function transformShipmentImportReviewToModel(
  response: ShipmentImportReviewResponseSchema,
): ShipmentImportReview {
  return {
    ...response,
    rows: response.rows.map((row) => ({ ...row })),
    customerResolutionSummary: {
      ...response.customerResolutionSummary,
      customers: response.customerResolutionSummary.customers.map((customer) => ({ ...customer })),
    },
  };
}

export function transformReceiptImportReviewToModel(
  response: ReceiptImportReviewResponseSchema,
): ReceiptImportReview {
  return {
    ...response,
    rows: response.rows.map((row) => ({ ...row })),
  };
}

export function transformMatchSummaryToModel(response: MatchSummaryResponseSchema): MatchSummary {
  return response;
}

export function transformMatchListToModel(
  response: MatchListResponseSchema,
  shipments: ShipmentRecord[],
  receipts: ReceiptRecord[],
): MatchList {
  const shipmentMap = new Map(shipments.map((record) => [record.id, record]));
  const receiptMap = new Map(receipts.map((record) => [record.id, record]));
  const matches: ReconciliationMatch[] = response.matches.map((match) => {
    const shipment = shipmentMap.get(match.shipmentRecordId) ?? null;
    const receipt = match.receiptRecordId ? receiptMap.get(match.receiptRecordId) ?? null : null;
    const statusMeta = reconciliationMatchStatusMeta(match.status);
    const shipmentQty = Math.abs(shipment?.qty ?? 0);
    const receiptQty = Math.abs(receipt?.qty ?? 0);
    const differenceQty = shipment && receipt ? shipmentQty - receiptQty : null;
    return {
      ...match,
      matchMethodLabel: reconciliationMatchMethodLabel(match.matchMethod),
      statusLabel: statusMeta.label,
      statusVariant: statusMeta.variant,
      shipment,
      receipt,
      differenceQty,
      noDifference: differenceQty === 0 && match.status === "candidate",
    };
  });

  const matchDetailResult = (match: ReconciliationMatch): Pick<MatchDetailRow, "resultLabel" | "resultVariant"> => {
    if (
      match.shipment?.demandOrderNo
      && match.receipt?.demandOrderNo
      && match.shipment.demandOrderNo !== match.receipt.demandOrderNo
    ) {
      return { resultLabel: "要货令不一致", resultVariant: "red" };
    }
    if (!match.receipt) {
      return { resultLabel: "缺收货", resultVariant: "amber" };
    }
    if ((match.differenceQty ?? 0) === 0) {
      return { resultLabel: "数量一致", resultVariant: "slate" };
    }
    return { resultLabel: "部分对账", resultVariant: "amber" };
  };

  const grouped = new Map<string, MatchGroupAccumulator>();

  const ensureGroup = (
    materialNo: string,
    materialName: string | null,
    shipment: ShipmentRecord | null = null,
  ) => {
    const key = materialNo || "未识别物料";
    const current = grouped.get(key) ?? {
      key,
      materialNo: key,
      materialName,
      shipment,
      matches: [],
      rows: [],
      candidateCount: 0,
      confirmedCount: 0,
      rejectedCount: 0,
      receiptCount: 0,
      hasShipment: false,
      hasReceipt: false,
      confirmedQty: 0,
      pendingQty: 0,
      shipmentQty: 0,
      receiptQty: 0,
      differenceQty: 0,
      shipmentIds: new Set<string>(),
      receiptIds: new Set<string>(),
      matchedShipmentIds: new Set<string>(),
      matchedReceiptIds: new Set<string>(),
    };
    if (!current.materialName) {
      current.materialName = materialName;
    }
    if (!current.shipment && shipment) {
      current.shipment = shipment;
    }
    grouped.set(key, current);
    return current;
  };

  const recomputeGroup = (group: MatchGroupAccumulator) => {
    group.differenceQty = group.shipmentQty - group.receiptQty;
    group.pendingQty = Math.max(group.shipmentQty - group.confirmedQty, 0);
  };

  for (const shipment of shipments) {
    const current = ensureGroup(shipment.internalPartNumber, shipment.materialName, shipment);
    if (!current.shipmentIds.has(shipment.id)) {
      current.shipmentIds.add(shipment.id);
      current.shipmentQty += Math.abs(shipment.qty);
      current.hasShipment = true;
      recomputeGroup(current);
    }
  }

  for (const receipt of receipts) {
    const current = ensureGroup(receipt.internalPartNumber, receipt.materialName);
    if (!current.receiptIds.has(receipt.id)) {
      current.receiptIds.add(receipt.id);
      current.receiptQty += Math.abs(receipt.qty);
      current.receiptCount += 1;
      current.hasReceipt = true;
      recomputeGroup(current);
    }
  }

  for (const match of matches) {
    const materialNo = match.shipment?.internalPartNumber || match.receipt?.internalPartNumber || "未识别物料";
    const current = ensureGroup(
      materialNo,
      match.shipment?.materialName ?? match.receipt?.materialName ?? null,
      match.shipment,
    );
    if (match.shipment && !current.shipmentIds.has(match.shipment.id)) {
      current.shipmentIds.add(match.shipment.id);
      current.shipmentQty += Math.abs(match.shipment.qty);
      current.hasShipment = true;
    }
    if (match.receipt && !current.receiptIds.has(match.receipt.id)) {
      current.receiptIds.add(match.receipt.id);
      current.receiptQty += Math.abs(match.receipt.qty);
      current.receiptCount += 1;
      current.hasReceipt = true;
    }
    current.matches.push(match);
    current.rows.push({
      key: `match:${match.id}`,
      kind: "match",
      match,
      shipment: match.shipment,
      receipt: match.receipt,
      matchedQty: match.matchedQty,
      matchMethod: match.matchMethod,
      matchMethodLabel: match.matchMethodLabel,
      confidenceScore: match.confidenceScore,
      status: match.status,
      statusLabel: !match.shipment || !match.receipt ? "待处理" : match.statusLabel,
      statusVariant: !match.shipment || !match.receipt ? "amber" : match.statusVariant,
      ...matchDetailResult(match),
    });
    if (match.shipment) current.matchedShipmentIds.add(match.shipment.id);
    if (match.receipt) current.matchedReceiptIds.add(match.receipt.id);
    if (match.status === "candidate" && match.shipment && match.receipt) current.candidateCount += 1;
    if (match.status === "confirmed") {
      current.confirmedCount += 1;
      current.confirmedQty += match.matchedQty;
    }
    if (match.status === "rejected") current.rejectedCount += 1;
    recomputeGroup(current);
  }

  for (const shipment of shipments) {
    const current = ensureGroup(shipment.internalPartNumber, shipment.materialName, shipment);
    if (current.matchedShipmentIds.has(shipment.id)) continue;
    current.rows.push({
      key: `shipment:${shipment.id}`,
      kind: "shipment_unmatched",
      match: null,
      shipment,
      receipt: null,
      matchedQty: null,
      matchMethod: "未生成候选",
      matchMethodLabel: reconciliationMatchMethodLabel("未生成候选"),
      confidenceScore: null,
      status: null,
      statusLabel: null,
      statusVariant: null,
      resultLabel: "缺收货",
      resultVariant: "red",
    });
  }

  for (const receipt of receipts) {
    const current = ensureGroup(receipt.internalPartNumber, receipt.materialName);
    if (current.matchedReceiptIds.has(receipt.id)) continue;
    current.rows.push({
      key: `receipt:${receipt.id}`,
      kind: "receipt_unmatched",
      match: null,
      shipment: null,
      receipt,
      matchedQty: null,
      matchMethod: "未生成候选",
      matchMethodLabel: reconciliationMatchMethodLabel("未生成候选"),
      confidenceScore: null,
      status: null,
      statusLabel: null,
      statusVariant: null,
      resultLabel: "缺发运",
      resultVariant: "red",
    });
  }

  const groups = Array.from(grouped.values())
    .map<MatchGroup>(({
      shipmentIds: _shipmentIds,
      receiptIds: _receiptIds,
      matchedShipmentIds: _matchedShipmentIds,
      matchedReceiptIds: _matchedReceiptIds,
      ...group
    }) => group)
    .sort((a, b) => {
      const aRisk = Number(a.differenceQty !== 0 || !a.hasReceipt || !a.hasShipment);
      const bRisk = Number(b.differenceQty !== 0 || !b.hasReceipt || !b.hasShipment);
      if (aRisk !== bRisk) return bRisk - aRisk;
      return a.materialNo.localeCompare(b.materialNo, "zh-CN");
    });

  return { matches, groups, returnAnnotations: response.returnAnnotations };
}

export function buildCommitPreviewRows(
  shipments: ShipmentRecord[],
  receipts: ReceiptRecord[],
  summary: MatchSummary | null,
  alreadyCommitted = false,
  groups: MatchGroup[] = [],
): CommitPreviewRow[] {
  if (!summary && groups.length === 0) return [];
  const confirmedRows = groups
    .flatMap((group) => group.rows)
    .filter((row) => row.kind === "match" && row.status === "confirmed");
  const shipmentHints = new Map<string, { shipmentQty: number }>();
  const receiptHints = new Map<string, { shipmentQty: number }>();
  for (const row of confirmedRows) {
    if (!row.shipment || !row.receipt) continue;
    const shipmentQty = Math.abs(row.shipment.qty);
    shipmentHints.set(row.shipment.id, {
      shipmentQty,
    });
    const receiptHint = receiptHints.get(row.receipt.id);
    receiptHints.set(row.receipt.id, {
      shipmentQty: (receiptHint?.shipmentQty ?? 0) + shipmentQty,
    });
  }
  const previewStatus = (
    qty: number | undefined,
    committedQty: number | undefined,
    pendingDelta: number,
  ) => {
    const matchedQty = (committedQty ?? 0) + (alreadyCommitted ? 0 : pendingDelta);
    const totalQty = Math.abs(qty ?? 0);
    const status = matchedQty >= totalQty && totalQty > 0
      ? "fully_matched"
      : matchedQty > 0
        ? "partial"
        : "unmatched";
    return reconciliationRecordStatusMeta(status);
  };
  const shipmentRows: CommitPreviewRow[] = Object.entries(summary?.pendingShipDeltas ?? {}).map(([id, delta]) => {
    const record = shipments.find((item) => item.id === id);
    const hint = shipmentHints.get(id);
    const after = previewStatus(record?.qty, record?.matchedReceiptQty, delta);
    return {
      id: `shipment:${id}`,
      side: "shipment",
      recordNo: record?.deliveryNo || id,
      recordDate: record?.shipmentDate ?? null,
      customerName: record?.customerName ?? "-",
      material: record?.internalPartNumber ?? "-",
      shipmentQty: record ? Math.abs(record.qty) : hint?.shipmentQty ?? null,
      beforeStatus: record?.reconciliationStatusLabel ?? "-",
      pendingDelta: delta,
      afterLabel: after.label,
      afterVariant: after.variant,
    };
  });
  const receiptRows: CommitPreviewRow[] = Object.entries(summary?.pendingRecvDeltas ?? {}).map(([id, delta]) => {
    const record = receipts.find((item) => item.id === id);
    const hint = receiptHints.get(id);
    const after = previewStatus(hint?.shipmentQty ?? record?.qty, record?.matchedShipmentQty, delta);
    return {
      id: `receipt:${id}`,
      side: "receipt",
      recordNo: record?.demandOrderNo || id,
      recordDate: record?.receiptDate ?? null,
      customerName: record?.customerName ?? "-",
      material: record?.internalPartNumber ?? "-",
      shipmentQty: hint?.shipmentQty ?? null,
      beforeStatus: record?.reconciliationStatusLabel ?? "-",
      pendingDelta: delta,
      afterLabel: after.label,
      afterVariant: after.variant,
    };
  });
  const matchedShipmentIds = new Set(confirmedRows.flatMap((row) => (
    row.shipment && row.receipt ? [row.shipment.id] : []
  )));
  const matchedReceiptIds = new Set(confirmedRows.flatMap((row) => (
    row.shipment && row.receipt ? [row.receipt.id] : []
  )));
  const missingShipmentRows: CommitPreviewRow[] = shipments
    .filter((record) => !matchedShipmentIds.has(record.id))
    .map((record) => ({
      id: `missing-shipment:${record.id}`,
      side: "shipment",
      recordNo: record.deliveryNo || record.id,
      recordDate: record.shipmentDate,
      customerName: record.customerName,
      material: record.internalPartNumber,
      shipmentQty: Math.abs(record.qty),
      beforeStatus: record.reconciliationStatusLabel,
      pendingDelta: null,
      afterLabel: "缺收货",
      afterVariant: "red",
    }));
  const missingReceiptRows: CommitPreviewRow[] = receipts
    .filter((record) => !matchedReceiptIds.has(record.id))
    .map((record) => ({
      id: `missing-receipt:${record.id}`,
      side: "receipt",
      recordNo: record.demandOrderNo || record.id,
      recordDate: record.receiptDate,
      customerName: record.customerName,
      material: record.internalPartNumber,
      shipmentQty: null,
      beforeStatus: record.reconciliationStatusLabel,
      pendingDelta: null,
      afterLabel: "缺发运",
      afterVariant: "red",
    }));
  return [...shipmentRows, ...receiptRows, ...missingShipmentRows, ...missingReceiptRows];
}
