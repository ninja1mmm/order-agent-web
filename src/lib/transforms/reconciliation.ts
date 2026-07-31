import type { CustomerConfig } from "@/types/models/settings";
import type {
  CommitPreviewRow,
  FileUploadResult,
  MatchGroup,
  MatchList,
  MatchSummary,
  MergeReview,
  MergeSummary,
  ReceiptRecord,
  ReconciliationConfigRow,
  ReconciliationMatch,
  ReconciliationSchedule,
  ReconciliationTask,
  ReconciliationTaskList,
  ShipmentRecord,
} from "@/types/models/reconciliation";
import type {
  MatchListResponseSchema,
  MatchSummaryResponseSchema,
  MergeReviewResponseSchema,
  MergeSummaryResponseSchema,
  ReceiptRecordListResponseSchema,
  ReceiptRecordResponseSchema,
  ReconciliationFileUploadResponseSchema,
  ReconciliationScheduleResponseSchema,
  ReconciliationTaskListResponseSchema,
  ReconciliationTaskResponseSchema,
  ShipmentRecordListResponseSchema,
  ShipmentRecordResponseSchema,
} from "@/types/schemas/reconciliation";

type Variant = "blue" | "green" | "amber" | "red" | "slate";

function customerName(customers: CustomerConfig[], customerId: string) {
  return customers.find((customer) => customer.id === customerId)?.name || customerId;
}

function periodLabel(from: string, to: string) {
  return `${from} - ${to}`;
}

function shipmentWindowLabel(from: string | null, to: string | null) {
  if (!from && !to) return "累计未对账发运池";
  return `${from ?? "-"} - ${to ?? "-"}`;
}

export function reconciliationTaskStatusMeta(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    draft: { label: "待开始", variant: "slate" },
    in_progress: { label: "对账中", variant: "blue" },
    closed: { label: "已关闭", variant: "green" },
    voided: { label: "已作废", variant: "red" },
    cancelled: { label: "已取消", variant: "amber" },
  };
  return map[status] ?? { label: status || "未知", variant: "slate" };
}

export function reconciliationRecordStatusMeta(status: string): { label: string; variant: Variant } {
  const map: Record<string, { label: string; variant: Variant }> = {
    unmatched: { label: "未匹配", variant: "slate" },
    partially_matched: { label: "部分匹配", variant: "amber" },
    partial: { label: "部分对账", variant: "amber" },
    fully_matched: { label: "完全匹配", variant: "green" },
    closed: { label: "已关闭", variant: "blue" },
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
    shipmentWindowFrom: task.shipmentWindowFrom,
    shipmentWindowTo: task.shipmentWindowTo,
    shipmentWindowLabel: shipmentWindowLabel(task.shipmentWindowFrom, task.shipmentWindowTo),
    status: task.status,
    statusLabel: meta.label,
    statusVariant: meta.variant,
    creationSource: task.creationSource,
    totalRecordCount: task.totalRecordCount ?? 0,
    matchedRecordCount: task.matchedRecordCount ?? 0,
    exceptionRecordCount: task.exceptionRecordCount ?? 0,
    remark: task.remark,
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
    : `每月 ${schedule.periodStartDay} - ${schedule.periodEndDay ?? schedule.periodStartDay} 日`;
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
  const meta = reconciliationRecordStatusMeta(record.reconciliationStatus);
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
    remainingQty,
    reconciliationStatus: record.reconciliationStatus,
    reconciliationStatusLabel: meta.label,
    statusVariant: meta.variant,
    locked: record.reconciliationStatus !== "unmatched",
    remark: record.remark,
    sourceFileId: record.sourceFileId,
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
  const meta = reconciliationRecordStatusMeta(record.reconciliationStatus);
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
    remainingQty,
    reconciliationStatus: record.reconciliationStatus,
    reconciliationStatusLabel: meta.label,
    statusVariant: meta.variant,
    locked: record.reconciliationStatus !== "unmatched",
    remark: record.remark,
    sourceFileId: record.sourceFileId,
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
    const differenceQty = shipment && receipt ? shipment.qty - receipt.qty : null;
    return {
      ...match,
      statusLabel: statusMeta.label,
      statusVariant: statusMeta.variant,
      shipment,
      receipt,
      differenceQty,
      noDifference: differenceQty === 0 && match.status === "candidate",
    };
  });

  const grouped = new Map<string, MatchGroup>();
  for (const match of matches) {
    const key = match.shipmentRecordId;
    const current = grouped.get(key) ?? {
      key,
      shipment: match.shipment,
      matches: [],
      candidateCount: 0,
      confirmedQty: 0,
      pendingQty: match.shipment?.remainingQty ?? 0,
    };
    current.matches.push(match);
    if (match.status === "candidate") current.candidateCount += 1;
    if (match.status === "confirmed") current.confirmedQty += match.matchedQty;
    grouped.set(key, current);
  }

  return { matches, groups: Array.from(grouped.values()) };
}

export function buildCommitPreviewRows(
  shipments: ShipmentRecord[],
  receipts: ReceiptRecord[],
  summary: MatchSummary | null,
): CommitPreviewRow[] {
  if (!summary) return [];
  const shipmentRows: CommitPreviewRow[] = Object.entries(summary.pendingShipDeltas).map(([id, delta]) => {
    const record = shipments.find((item) => item.id === id);
    return {
      id: `shipment:${id}`,
      side: "shipment",
      recordNo: record?.deliveryNo || id,
      customerName: record?.customerName ?? "-",
      material: record?.internalPartNumber ?? "-",
      beforeStatus: record?.reconciliationStatusLabel ?? "-",
      pendingDelta: delta,
      afterLabel: delta === 0 ? "完全匹配" : "部分匹配",
    };
  });
  const receiptRows: CommitPreviewRow[] = Object.entries(summary.pendingRecvDeltas).map(([id, delta]) => {
    const record = receipts.find((item) => item.id === id);
    return {
      id: `receipt:${id}`,
      side: "receipt",
      recordNo: record?.demandOrderNo || id,
      customerName: record?.customerName ?? "-",
      material: record?.internalPartNumber ?? "-",
      beforeStatus: record?.reconciliationStatusLabel ?? "-",
      pendingDelta: delta,
      afterLabel: delta === 0 ? "完全匹配" : "部分匹配",
    };
  });
  return [...shipmentRows, ...receiptRows];
}
