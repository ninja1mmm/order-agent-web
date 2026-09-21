import type { MailProcessingState } from "@/services/inbox";
import type { Locale } from "../../_components/shared";

export type WorkbenchMailStatus = MailProcessingState;
export type WorkbenchStatusFilter = "all" | WorkbenchMailStatus;

const workbenchStatusLabels: Record<Locale, Record<WorkbenchMailStatus, string>> = {
  "zh-CN": {
    not_started: "未开始",
    processing: "处理中",
    completed: "已完成",
  },
  "zh-TW": {
    not_started: "未開始",
    processing: "處理中",
    completed: "已完成",
  },
  en: {
    not_started: "Not started",
    processing: "Processing",
    completed: "Completed",
  },
};

export function workbenchStatusOptions(locale: Locale) {
  return [
    { value: "all", label: locale === "en" ? "All statuses" : locale === "zh-TW" ? "全部狀態" : "全部状态" },
    ...(["not_started", "processing", "completed"] as const).map((value) => ({
      value,
      label: workbenchStatusLabels[locale][value],
    })),
  ];
}

export function workbenchMailStatusLabel(status: WorkbenchMailStatus, locale: Locale) {
  return workbenchStatusLabels[locale][status];
}

export function getWorkbenchMailStatus(processingState: MailProcessingState): WorkbenchMailStatus {
  return processingState;
}

export const docTypeLabel: Record<string, Record<Locale, string>> = {
  supplier_release: { "zh-CN": "Sales Forecast", "zh-TW": "Sales Forecast", en: "Sales Forecast" },
  forecast_excel: { "zh-CN": "Sales Forecast", "zh-TW": "Sales Forecast", en: "Sales Forecast" },
  shipping_plan_excel: { "zh-CN": "Shipping Plan", "zh-TW": "Shipping Plan", en: "Shipping Plan" },
  manifest: { "zh-CN": "Shipping Plan", "zh-TW": "Shipping Plan", en: "Shipping Plan" },
  pallet_label: { "zh-CN": "Shipping Plan", "zh-TW": "Shipping Plan", en: "Shipping Plan" },
};

export const docTypeBadge: Record<string, "blue" | "green" | "amber" | "slate"> = {
  supplier_release: "blue",
  forecast_excel: "blue",
  shipping_plan_excel: "green",
  manifest: "green",
  pallet_label: "green",
};

export function parseReviewStatus(status: string) {
  return status === "processing" ? "running" : status;
}

export function truncateMiddle(name: string, maxLen = 36): string {
  if (name.length <= maxLen) return name;
  const extIdx = name.lastIndexOf(".");
  const ext = extIdx > 0 ? name.slice(extIdx) : "";
  const base = extIdx > 0 ? name.slice(0, extIdx) : name;
  const keep = maxLen - ext.length - 3;
  if (keep < 6) return name.slice(0, maxLen - 3) + "..." + ext;
  const head = Math.ceil(keep * 0.6);
  const tail = keep - head;
  return base.slice(0, head) + "..." + base.slice(-tail) + ext;
}
