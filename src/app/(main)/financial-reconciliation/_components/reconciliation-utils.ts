import type { CustomerConfig } from "@/services/settings";
import type {
  ReceiptRecord,
  ReceiptRecordDraft,
  ReconciliationSchedule,
  ReconciliationScheduleDraft,
  ShipmentRecord,
  ShipmentRecordDraft,
} from "@/services/reconciliation";

export const PAGE_SIZE = 20;

export function todayKey() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function firstDayOfMonth() {
  const today = todayKey();
  return `${today.slice(0, 8)}01`;
}

export function formatDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "-";
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("zh-CN", { hour12: false });
}

function clampMonthDay(year: number, monthIndex: number, day: number | null | undefined) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day ?? lastDay, 1), lastDay);
}

function dateKeyFromParts(year: number, monthIndex: number, day: number | null | undefined) {
  const safeDay = clampMonthDay(year, monthIndex, day);
  const value = new Date(year, monthIndex, safeDay);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function formatQty(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("zh-CN");
}

export function normalizeIntegerText(value: string) {
  const compact = value.replace(/\s/g, "");
  const negative = compact.startsWith("-");
  const unsigned = (negative ? compact.slice(1) : compact).split(".")[0].replace(/\D/g, "");
  return `${negative ? "-" : ""}${unsigned}`;
}

export function integerTextToNumber(value: string) {
  if (!value || value === "-") return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function customerOptions(customers: CustomerConfig[], includeAll = true) {
  const options = customers.map((customer) => ({
    value: customer.id,
    label: customer.name || customer.code || customer.id,
  }));
  return includeAll ? [{ value: "", label: "全部客户" }, ...options] : options;
}

export function materialOptions(customers: CustomerConfig[], customerId: string, currentPartNumber = "") {
  const customer = customers.find((item) => item.id === customerId);
  const seen = new Set<string>();
  const options = (customer?.materialMappings ?? [])
    .filter((mapping) => mapping.internalPartNumber)
    .filter((mapping) => {
      if (seen.has(mapping.internalPartNumber)) return false;
      seen.add(mapping.internalPartNumber);
      return true;
    })
    .map((mapping) => {
      const description = mapping.designation ? ` - ${mapping.designation}` : "";
      return {
        value: mapping.internalPartNumber,
        label: `${mapping.internalPartNumber}${description}`,
      };
    });

  if (currentPartNumber && !seen.has(currentPartNumber)) {
    options.unshift({ value: currentPartNumber, label: currentPartNumber });
  }

  return options;
}

export function materialNameFromMapping(customers: CustomerConfig[], customerId: string, internalPartNumber: string) {
  const customer = customers.find((item) => item.id === customerId);
  const mapping = customer?.materialMappings.find((item) => item.internalPartNumber === internalPartNumber);
  return mapping?.designation ?? "";
}

export function canEditLocked(locked: boolean) {
  return locked ? "已进入对账或关闭状态，不能编辑/删除" : undefined;
}

export function defaultShipmentDraft(customers: CustomerConfig[]): ShipmentRecordDraft {
  return {
    customerId: customers[0]?.id ?? "",
    sapCustomerCode: customers[0]?.code ?? "",
    internalPartNumber: "",
    materialName: "",
    qty: 0,
    shipmentDate: todayKey(),
    deliveryNo: "",
    demandOrderNo: "",
    remark: "",
  };
}

export function shipmentToDraft(record: ShipmentRecord): ShipmentRecordDraft {
  return {
    customerId: record.customerId,
    sapCustomerCode: record.sapCustomerCode,
    internalPartNumber: record.internalPartNumber,
    materialName: record.materialName ?? "",
    qty: record.qty,
    shipmentDate: record.shipmentDate,
    deliveryNo: record.deliveryNo ?? "",
    demandOrderNo: record.demandOrderNo ?? "",
    remark: record.remark ?? "",
  };
}

export function defaultReceiptDraft(customers: CustomerConfig[]): ReceiptRecordDraft {
  return {
    customerId: customers[0]?.id ?? "",
    customerType: "internal",
    internalPartNumber: "",
    materialName: "",
    qty: 0,
    receiptDate: todayKey(),
    demandOrderNo: "",
    remark: "",
  };
}

export function receiptToDraft(record: ReceiptRecord): ReceiptRecordDraft {
  return {
    customerId: record.customerId,
    customerType: record.customerType,
    internalPartNumber: record.internalPartNumber,
    materialName: record.materialName ?? "",
    qty: record.qty,
    receiptDate: record.receiptDate,
    demandOrderNo: record.demandOrderNo ?? "",
    remark: record.remark ?? "",
  };
}

export function defaultScheduleDraft(): ReconciliationScheduleDraft {
  return {
    enabled: true,
    periodType: "monthly",
    periodStartDay: 1,
    periodEndDay: 31,
    triggerDay: 1,
    triggerTime: "09:00",
  };
}

export function scheduleToDraft(schedule: ReconciliationSchedule): ReconciliationScheduleDraft {
  return {
    enabled: schedule.enabled,
    periodType: schedule.periodType === "weekly" ? "weekly" : "monthly",
    periodStartDay: schedule.periodStartDay,
    periodEndDay: schedule.periodEndDay ?? schedule.periodStartDay,
    triggerDay: schedule.triggerDay,
    triggerTime: schedule.triggerTime,
  };
}

export function scheduleBoundaryLabel(
  schedule: ReconciliationSchedule,
  boundary: "start" | "end",
) {
  if (schedule.periodType === "weekly") {
    const value = boundary === "start"
      ? schedule.periodStartDay
      : (schedule.periodEndDay ?? schedule.periodStartDay);
    return `周 ${value}`;
  }

  if (boundary === "start") return `上月 ${schedule.periodStartDay} 日`;
  return schedule.periodEndDay ? `本月 ${schedule.periodEndDay} 日` : "本月末日";
}

export function schedulePeriodRuleLabel(schedule: ReconciliationSchedule) {
  return `${scheduleBoundaryLabel(schedule, "start")} - ${scheduleBoundaryLabel(schedule, "end")}`;
}

export function nextScheduleTaskLabel(schedule: ReconciliationSchedule, now = new Date()) {
  if (!schedule.enabled) return "计划停用";

  const [hourText, minuteText] = schedule.triggerTime.split(":");
  const hour = Number.parseInt(hourText ?? "0", 10);
  const minute = Number.parseInt(minuteText ?? "0", 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "触发时间异常";

  if (schedule.periodType === "weekly") {
    const currentWeekday = now.getDay() === 0 ? 7 : now.getDay();
    const daysUntilTrigger = (schedule.triggerDay - currentWeekday + 7) % 7;
    const triggerDate = new Date(now);
    triggerDate.setDate(now.getDate() + daysUntilTrigger);
    triggerDate.setHours(hour, minute, 0, 0);
    if (triggerDate.getTime() <= now.getTime()) triggerDate.setDate(triggerDate.getDate() + 7);
    return `${dateKeyFromParts(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate())} ${schedule.triggerTime}`;
  }

  const triggerDate = new Date(now.getFullYear(), now.getMonth(), clampMonthDay(now.getFullYear(), now.getMonth(), schedule.triggerDay), hour, minute);
  if (triggerDate.getTime() <= now.getTime()) {
    triggerDate.setMonth(triggerDate.getMonth() + 1, 1);
    triggerDate.setDate(clampMonthDay(triggerDate.getFullYear(), triggerDate.getMonth(), schedule.triggerDay));
    triggerDate.setHours(hour, minute, 0, 0);
  }

  const previousMonth = new Date(triggerDate.getFullYear(), triggerDate.getMonth() - 1, 1);
  const from = dateKeyFromParts(previousMonth.getFullYear(), previousMonth.getMonth(), schedule.periodStartDay);
  const to = dateKeyFromParts(triggerDate.getFullYear(), triggerDate.getMonth(), schedule.periodEndDay);
  const trigger = `${dateKeyFromParts(triggerDate.getFullYear(), triggerDate.getMonth(), triggerDate.getDate())} ${schedule.triggerTime}`;
  return `${trigger} 创建：${from} 至 ${to}`;
}

export function normalizedValuePreview(data: Record<string, unknown>) {
  return Object.entries(data)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value ?? "-")}`)
    .join(" | ");
}
