"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getInboxWorkspace,
  type WorkspaceMail,
  type WorkspaceStats,
  type WorkspaceTask,
} from "@/services/inbox";
import { listCustomers, type CustomerConfig } from "@/services/settings";

export type Locale = "zh-CN" | "zh-TW" | "en";
export const BEIJING_TIME_ZONE = "Asia/Shanghai";

const API_DATETIME_WITHOUT_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/;
const API_DATETIME_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i;

export function parseBackendDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const normalized = API_DATETIME_WITHOUT_ZONE.test(value) && !API_DATETIME_WITH_ZONE.test(value)
    ? `${value}Z`
    : value;
  return new Date(normalized);
}

export function backendDateMs(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const time = parseBackendDate(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function beijingDateKey(value: string | Date | null | undefined): string {
  if (!value) return "";
  try {
    const date = parseBackendDate(value);
    if (Number.isNaN(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: BEIJING_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return "";
  }
}

export const copy: Record<
  Locale,
  {
    inbox: string;
    parse: string;
    order: string;
    newMail: string;
    trigger: string;
    reparse: string;
    refresh: string;
    add: string;
    download: string;
    review: string;
    view: string;
    viewResult: string;
    yesterdaySummary: string;
    completedParse: string;
    involvedCustomers: string;
    enteredTodo: string;
    needFollowUp: string;
    involvedCustomerTitle: string;
    yesterdayPending: string;
    customerRhythm: string;
    days30: string;
    today: string;
    pendingTasks: string;
    mailList: string;
    mailBody: string;
    aiAttachmentResults: string;
    attachmentTasks: string;
    attachmentPreview: string;
    agentFlow: string;
    orderTable: string;
    salesForecast: string;
    shippingPlan: string;
    currentValue: string;
    deltaValue: string;
    export: string;
    filterCustomer: string;
    filterTime: string;
    filterAttachment: string;
    filterStatus: string;
    filterDate: string;
    filterMaterial: string;
    filterChange: string;
    filterProgram: string;
    all: string;
    close: string;
    submit: string;
    noMail: string;
    noAttachment: string;
    loadingPreview: string;
    previewLoadFailed: string;
    noForecast: string;
    readonly: string;
    customerLabel: string;
    receivedAt: string;
    zoomIn: string;
    zoomOut: string;
    page: string;
  }
> = {
  "zh-CN": {
    inbox: "客户收件箱",
    parse: "解析审查",
    order: "订单",
    newMail: "新增邮件",
    trigger: "开始解析",
    reparse: "重新解析",
    refresh: "刷新",
    add: "新增",
    download: "下载",
    review: "审查结果",
    view: "查看",
    viewResult: "查看结果",
    yesterdaySummary: "昨日工作总结",
    completedParse: "完成解析",
    involvedCustomers: "涉及客户",
    enteredTodo: "进入待办",
    needFollowUp: "需要跟催",
    involvedCustomerTitle: "涉及客户",
    yesterdayPending: "昨日进入待处理",
    customerRhythm: "客户回邮件节奏",
    days30: "30 天",
    today: "今日",
    pendingTasks: "待处理任务",
    mailList: "邮件列表",
    mailBody: "邮件原文",
    aiAttachmentResults: "AI 附件解析结果",
    attachmentTasks: "附件任务",
    attachmentPreview: "附件原文预览",
    agentFlow: "Agent 执行流",
    orderTable: "标准订单输出表",
    salesForecast: "Sales Forecast",
    shippingPlan: "Shipping Plan",
    currentValue: "当前值",
    deltaValue: "变化量",
    export: "导出",
    filterCustomer: "客户",
    filterTime: "时间",
    filterAttachment: "附件",
    filterStatus: "状态",
    filterDate: "日期",
    filterMaterial: "料号",
    filterChange: "变化",
    filterProgram: "Program",
    all: "全部",
    close: "关闭",
    submit: "提交",
    noMail: "暂无邮件",
    noAttachment: "暂无附件",
    loadingPreview: "正在加载附件预览...",
    previewLoadFailed: "附件预览加载失败",
    noForecast: "当前暂无 Sales Forecast 数据。",
    readonly: "只读",
    customerLabel: "客户",
    receivedAt: "收件",
    zoomIn: "放大",
    zoomOut: "缩小",
    page: "页码",
  },
  "zh-TW": {
    inbox: "客戶收件箱",
    parse: "解析審查",
    order: "訂單",
    newMail: "新增郵件",
    trigger: "開始解析",
    reparse: "重新解析",
    refresh: "刷新",
    add: "新增",
    download: "下載",
    review: "審查結果",
    view: "查看",
    viewResult: "查看結果",
    yesterdaySummary: "昨日工作總結",
    completedParse: "完成解析",
    involvedCustomers: "涉及客戶",
    enteredTodo: "進入待辦",
    needFollowUp: "需要跟催",
    involvedCustomerTitle: "涉及客戶",
    yesterdayPending: "昨日進入待處理",
    customerRhythm: "客戶回郵件節奏",
    days30: "30 天",
    today: "今日",
    pendingTasks: "待處理任務",
    mailList: "郵件列表",
    mailBody: "郵件原文",
    aiAttachmentResults: "AI 附件解析結果",
    attachmentTasks: "附件任務",
    attachmentPreview: "附件原文預覽",
    agentFlow: "Agent 執行流",
    orderTable: "標準訂單輸出表",
    salesForecast: "Sales Forecast",
    shippingPlan: "Shipping Plan",
    currentValue: "當前值",
    deltaValue: "變化量",
    export: "導出",
    filterCustomer: "客戶",
    filterTime: "時間",
    filterAttachment: "附件",
    filterStatus: "狀態",
    filterDate: "日期",
    filterMaterial: "料號",
    filterChange: "變化",
    filterProgram: "Program",
    all: "全部",
    close: "關閉",
    submit: "提交",
    noMail: "暫無郵件",
    noAttachment: "暫無附件",
    loadingPreview: "正在載入附件預覽...",
    previewLoadFailed: "附件預覽載入失敗",
    noForecast: "當前暫無 Sales Forecast 數據。",
    readonly: "唯讀",
    customerLabel: "客戶",
    receivedAt: "收件",
    zoomIn: "放大",
    zoomOut: "縮小",
    page: "頁碼",
  },
  en: {
    inbox: "Inbox",
    parse: "Parse Review",
    order: "Orders",
    newMail: "New Mail",
    trigger: "Parse",
    reparse: "Reparse",
    refresh: "Refresh",
    add: "Add",
    download: "Download",
    review: "Review",
    view: "View",
    viewResult: "View Result",
    yesterdaySummary: "Yesterday Summary",
    completedParse: "Parsed",
    involvedCustomers: "Customers",
    enteredTodo: "To-do",
    needFollowUp: "Follow-up",
    involvedCustomerTitle: "Customers",
    yesterdayPending: "Entered Pending",
    customerRhythm: "Customer Mail Rhythm",
    days30: "30 Days",
    today: "Today",
    pendingTasks: "Pending Tasks",
    mailList: "Mail List",
    mailBody: "Mail Body",
    aiAttachmentResults: "AI Attachment Results",
    attachmentTasks: "Attachment Tasks",
    attachmentPreview: "Attachment Preview",
    agentFlow: "Agent Flow",
    orderTable: "Standard Order Output",
    salesForecast: "Sales Forecast",
    shippingPlan: "Shipping Plan",
    currentValue: "Current",
    deltaValue: "Delta",
    export: "Export",
    filterCustomer: "Customer",
    filterTime: "Time",
    filterAttachment: "Attachment",
    filterStatus: "Status",
    filterDate: "Date",
    filterMaterial: "Material",
    filterChange: "Change",
    filterProgram: "Program",
    all: "All",
    close: "Close",
    submit: "Submit",
    noMail: "No mail",
    noAttachment: "No attachment",
    loadingPreview: "Loading attachment preview...",
    previewLoadFailed: "Attachment preview failed",
    noForecast: "No Sales Forecast data yet.",
    readonly: "Read-only",
    customerLabel: "Customer",
    receivedAt: "Received",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    page: "Page",
  },
};

export function useLocale(): Locale {
  const params = useSearchParams();
  const lang = params.get("lang");
  if (lang === "zh-TW" || lang === "en") return lang;
  return "zh-CN";
}

export function useWorkspacePolling() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mails, setMails] = useState<WorkspaceMail[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);

  const load = async () => {
    try {
      const workspace = await getInboxWorkspace();
      setMails(workspace.mails);
      setTasks(workspace.tasks);
      setStats(workspace.stats ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(load, 10000);
    window.setTimeout(load, 0);
    return () => window.clearInterval(timer);
  }, []);

  return { loading, error, mails, tasks, stats, refresh: load };
}

export function useCustomerConfig() {
  const [customers, setCustomers] = useState<CustomerConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setCustomers(await listCustomers());
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, []);

  return { customers, loading, refreshCustomers: load };
}

export function customerLabel(customer: Pick<CustomerConfig, "id" | "name">) {
  return customer.name || customer.id;
}

export function customerLabelFromId(customers: CustomerConfig[], customerId: string | null | undefined, fallback?: string | null) {
  const config = customers.find((customer) => customer.id === customerId);
  if (config) return customerLabel(config);
  return fallback || customerId || "-";
}

export function formatShortDate(value: string | Date) {
  const date = parseBackendDate(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BEIJING_TIME_ZONE,
    month: "numeric",
    day: "2-digit",
  }).formatToParts(date);
  const month = parts.find((item) => item.type === "month")?.value ?? "";
  const day = parts.find((item) => item.type === "day")?.value ?? "";
  return `${month}/${day}`;
}

export function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return "-";
  const date = parseBackendDate(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale === "en" ? "en-US" : locale, {
    timeZone: BEIJING_TIME_ZONE,
    hour12: false,
  });
}

export function taskStatusLabel(status: string, locale: Locale) {
  const map: Record<Locale, Record<string, string>> = {
    "zh-CN": {
      completed: "已完成",
      published: "已完成",
      failed: "解析失败",
      running: "进行中",
      processing: "进行中",
      queued: "待解析",
      pending: "待解析",
      skipped: "已跳过",
      cancelled: "已取消",
      waiting_human_decision: "等待人工",
    },
    "zh-TW": {
      completed: "已完成",
      published: "已完成",
      failed: "解析失敗",
      running: "進行中",
      processing: "進行中",
      queued: "待解析",
      pending: "待解析",
      skipped: "已跳過",
      cancelled: "已取消",
      waiting_human_decision: "等待人工",
    },
    en: {
      completed: "Completed",
      published: "Completed",
      failed: "Failed",
      running: "Running",
      processing: "Running",
      queued: "Pending",
      pending: "Pending",
      skipped: "Skipped",
      cancelled: "Cancelled",
      waiting_human_decision: "Needs review",
    },
  };
  return map[locale][status] ?? status;
}

const STEP_NAME_ZH: Record<string, string> = {
  extraction: "AI 提取",
  date_expansion: "日期扩展",
  conflict_resolution: "冲突检测",
  material_mapping: "料号匹配",
  published: "已发布",
};

export function translatePipelineSummary(text: string | null | undefined): string | null {
  if (!text) return null;

  let m: RegExpMatchArray | null;

  m = text.match(/^(\d+)\s+rows?\s+extracted$/i);
  if (m) return `${m[1]} 行已提取`;

  m = text.match(/^(\d+)\s+rows?\s+after\s+(\w+)$/i);
  if (m) return `${m[1]} 行经过${STEP_NAME_ZH[m[2]] ?? m[2]}处理`;

  m = text.match(/^(\d+)\s+rows?\s+have\s+conflicts?\s+requiring\s+review\.?$/i);
  if (m) return `${m[1]} 行存在冲突，需要人工审核`;

  m = text.match(/^(\d+)\s+part\s+numbers?\s+could\s+not\s+be\s+mapped\.?$/i);
  if (m) return `${m[1]} 个料号无法匹配`;

  m = text.match(/^(\d+)\s+part\s+numbers?\s+unmapped\.?$/i);
  if (m) return `${m[1]} 个料号未匹配`;

  m = text.match(/^no\s+rows\s+extracted\.?$/i);
  if (m) return "未提取到任何行";

  m = text.match(/^(\d+)\s+rows?\s+published\.?$/i);
  if (m) return `${m[1]} 行已发布`;

  m = text.match(/^(\d+)\s+rows?\s+skipped\.?$/i);
  if (m) return `${m[1]} 行已跳过`;

  return text;
}
