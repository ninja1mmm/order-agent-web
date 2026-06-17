"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  getInboxWorkspace,
  type WorkspaceMail,
  type WorkspaceStats,
  type WorkspaceTask,
} from "../../../services/inbox";

export type Locale = "zh-CN" | "zh-TW" | "en";

export const copy: Record<
  Locale,
  {
    inbox: string;
    parse: string;
    order: string;
    newMail: string;
    trigger: string;
    refresh: string;
    add: string;
    download: string;
    review: string;
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
    refresh: "刷新",
    add: "新增",
    download: "下载",
    review: "审查结果",
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
    refresh: "刷新",
    add: "新增",
    download: "下載",
    review: "審查結果",
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
    refresh: "Refresh",
    add: "Add",
    download: "Download",
    review: "Review",
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

export function formatShortDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(value: string | null | undefined, locale: Locale) {
  if (!value) return "-";
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : locale);
}

export function taskStatusLabel(status: string, locale: Locale) {
  const map: Record<Locale, Record<string, string>> = {
    "zh-CN": {
      completed: "已完成",
      failed: "解析失败",
      running: "进行中",
      queued: "排队中",
      waiting_human_decision: "等待人工",
    },
    "zh-TW": {
      completed: "已完成",
      failed: "解析失敗",
      running: "進行中",
      queued: "排隊中",
      waiting_human_decision: "等待人工",
    },
    en: {
      completed: "Completed",
      failed: "Failed",
      running: "Running",
      queued: "Queued",
      waiting_human_decision: "Needs review",
    },
  };
  return map[locale][status] ?? status;
}
