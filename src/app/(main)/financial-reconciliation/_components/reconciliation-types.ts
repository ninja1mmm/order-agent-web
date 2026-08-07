export type ReconciliationTabKey = "tasks" | "config" | "shipments" | "receipts";

export type ReconciliationTab = {
  key: ReconciliationTabKey;
  label: string;
  href: string;
};

export const reconciliationTabs: ReconciliationTab[] = [
  { key: "tasks", label: "对账任务中心", href: "/financial-reconciliation/tasks" },
  { key: "config", label: "对账配置", href: "/financial-reconciliation/config" },
  { key: "shipments", label: "发运记录", href: "/financial-reconciliation/shipments" },
  { key: "receipts", label: "收货记录", href: "/financial-reconciliation/receipts" },
];

export const reconciliationStatusOptions = [
  { value: "", label: "全部状态" },
  { value: "unmatched", label: "未匹配" },
  { value: "partial", label: "部分匹配" },
  { value: "fully_matched", label: "完全匹配" },
  { value: "in_transit", label: "在途" },
  { value: "closed", label: "已关闭" },
];

export const taskStatusOptions = [
  { value: "", label: "全部任务" },
  { value: "draft", label: "待开始" },
  { value: "in_progress", label: "对账中" },
  { value: "closing", label: "关闭中" },
  { value: "closed", label: "已关闭" },
  { value: "reopening", label: "重开中" },
  { value: "voiding", label: "作废中" },
  { value: "voided", label: "已作废" },
  { value: "cancelled", label: "已取消" },
];

export const importResolutionOptions = [
  { value: "insert_incremental", label: "增量入池" },
  { value: "overwrite", label: "覆盖已有" },
  { value: "keep_both", label: "保留两条" },
  { value: "skip", label: "跳过" },
  { value: "void_existing", label: "作废已有" },
];
