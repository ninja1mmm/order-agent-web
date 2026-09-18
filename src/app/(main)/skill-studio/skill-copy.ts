import type { CorrectionStatus, RunMode, RunPhase, RunStatus } from "@/types/models/skills";

/** Centralized zh-CN copy for Skill Studio. No multi-locale — internal tool. */
export const t = {
  // --- Studio page ---
  title: "技能工坊",
  subtitle: "独立配置、测试并运行 Orders 审计",
  list: "Skill 清单",
  create: "新建",
  definition: "Skill 定义",
  definitionHint: "保存后即可试运行或正式运行",
  save: "保存",
  saved: "Skill 已保存",
  generate: "生成提示词",
  generating: "生成中…",
  noSkills: "尚无 Skill，创建一个开始配置。",
  deleteSkill: "删除 Skill",
  deleteSkillConfirm: "删除后 Skill 将从清单隐藏，历史 Run 仍会保留。确认删除？",
  unboundCustomer: "未绑定客户",
  newTestRun: "新建试运行",
  newFormalRun: "新建正式运行",
  runHistory: "运行历史",
  runHistoryHint: "新建运行后，在 Run 页选择日期与物料并预览最终数据快照。",
  noRuns: "暂无运行记录",
  deleteRunConfirm: "该运行尚未合并，确认删除？",
  runDeleted: "运行已删除",
  prevPage: "上一页",
  nextPage: "下一页",
  backToOrders: "返回订单",
  searchPlaceholder: "搜索 Skill",
  cellsLabel: (n: number) => `${n} cells`,
  pendingData: "待选择数据",

  // --- Skill fields ---
  name: "名称",
  scope: "适用范围",
  description: "自然语言审计要求",
  prompt: "可编辑审计提示词",
  customer: "客户",
  dateRange: "日期范围",
  material: "物料",

  // --- Generation progress ---
  generationTitle: "正在设计 Skill 提示词",
  generationSteps: ["理解客户自然语言", "保留阈值与例外条件", "翻译业务规则与修改动作", "校验精简 Skill 结构"] as const,
  generationDone: "完成后会自动填入可编辑提示词。",

  // --- Run page ---
  backToStudio: "返回技能工坊",
  runSummary: "运行摘要",
  deleteRun: "删除运行",
  notFound: "未找到 Skill 运行",
  filtersCustomer: "客户",
  filtersDate: "日期",
  filtersType: "类型",
  filtersMaterial: "物料",
  filtersPending: "待选择",
  filtersAllMaterials: "全部物料",
  materialCount: (n: number) => `${n} 项`,

  // --- Steps ---
  step1: "确认数据",
  step2: "执行与校验",
  step3: "合并 / 导出",
  step1Title: "Step 1 · 选择并确认数据",
  step1Hint: "载入快照后先检查客户、物料、日期、数量和预测类型。",
  step2Title: "Step 2 · 执行、校验并修正",
  step2Hint: (customer: string) => `客户固定为 ${customer}；编辑物料、日期和数量时会自动带入该客户信息。`,
  step3Title: "Step 3 · 合并或导出",
  step3Hint: "确认本批变更后写入 Orders；提交时会再次核对实时修订号。",

  // --- Step 1 ---
  confirmAndExecute: "确认并执行",
  executeConfirmTitle: "确认执行",
  executeConfirmBody: (customer: string, from: string, to: string, cells: number) =>
    `客户：${customer}\n日期范围：${from} ~ ${to}\n单元格：${cells} 个\n\n确认执行？`,
  immutableSnapshot: "不可变执行快照",
  loadSnapshot: "载入选择结果",
  snapshotLoaded: (n: number) => `已载入 ${n} 个单元格`,
  dateRangeError: "开始日期不能晚于结束日期",
  searchMaterial: "搜索当前客户的有效物料",
  noMatchingMaterial: "没有匹配的有效物料",
  materialHint: "未选择物料表示全部。修改范围后需重新载入快照。",
  snapshotDirtyHint: "范围已修改，下方仍是上一次快照；请重新载入后再执行。",
  noData: "尚未载入数据",
  noDataHint: "设置范围后点击「载入选择结果」查看完整快照",

  // --- Issues panel ---
  blockingIssuesTitle: (n: number) => `快照存在 ${n} 个阻断问题，请修正后再执行`,
  warningHintsTitle: (n: number) => `提示（${n}）`,

  // --- Step 2 ---
  revalidate: "重新校验",
  recreateRun: "重新创建运行",
  executionFailed: "执行失败",
  executionFailedDefault: "模型执行异常",
  aiAuditTitle: "AI 审计结论",
  aiAuditNoSummary: "模型未提供审计摘要。",
  adviceTitle: "处理建议",
  noAdvice: "模型未提供具体修正建议。",
  noCorrections: "模型未返回修正项",
  noCorrectionsHint: "请结合上方 AI 审计结论和服务端原始输出日志确认业务规则是否被正确理解。",
  goToExport: "查看导出操作",
  validateAndNext: "校验并进入下一步",
  allCorrectionBlocked: "所有修正项均异常，无法进入合并步骤",
  selectionHint: (selected: number, total: number) => `已勾选 ${selected} / ${total} 项，仅勾选项会进入合并`,
  validationDone: (valid: number, blocked: number) => `校验完成：${valid} 项可合并，${blocked} 项异常`,
  quantityError: "数量必须是非负整数",
  correctionSaved: "修正项已保存并重新校验",
  dataReloaded: "数据已被修改，正在刷新…",

  // --- Execution progress ---
  executing: "正在执行",
  executingTimer: (s: number) => `${s}s / 180s`,
  executingHint: "格式校验失败会在三分钟总时限内自动重试；刷新页面会从服务端恢复真实阶段。",

  // --- Corrections table ---
  filterAll: "全部",
  filterValid: "可合并",
  filterBlocked: "异常",
  filterMerged: "已合并",
  noFilteredCorrections: "当前筛选没有修正项",
  colSelect: "合并",
  colCustomer: "客户",
  colBefore: "修改前",
  colAfter: "修改后（可编辑）",
  colValidation: "校验",
  colAction: "操作",
  saveAndValidate: "保存并校验",
  materialLabel: "物料",
  dateLabel: "日期",
  quantityLabel: "数量",
  typeLabel: "类型",
  collisionLabel: "冲突",
  collisionPlaceholder: "请选择处理方式",
  collisionReplace: "覆盖目标",
  collisionIncrement: "累加目标",
  selectMaterial: "请选择客户料号",
  restoreHint: (qty: string) => `原位置将恢复为 ${qty}`,
  changeTag: (label: string) => `${label}变更`,

  // --- Correction issue display ---
  errorBadge: (n: number) => `${n} 项异常`,
  warningBadge: (n: number) => `${n} 项提示`,
  statusValid: "可合并",
  needsReview: "需确认",
  statusBlocked: "异常",
  statusMerged: "已合并",

  // --- Step 3 ---
  selectedCount: "本批选中",
  expectedWrites: "预计写入记录",
  sourceRestores: "源位置恢复",
  pendingBlocked: "待处理异常",
  submittedBatches: "已提交批次",
  mergeSummary: (n: number, records: number) => `本批选中 ${n} 项修正，预计写入 ${records} 条记录`,
  aboutToWrite: "即将写入 Orders",
  noMergeSelection: "尚未选择可合并项，请返回 Step 2 选择。",
  exportResult: "导出结果",
  confirmMerge: (n: number) => `确认合并并写入 Orders (${n})`,
  testModeWarning: "当前为试运行，仅用于预览、校验和调整；如需写入 Orders，请返回技能工坊创建正式运行。",
  mergeHistory: "合并记录",
  mergeBatchLabel: (count: number) => `已提交 · ${count} 项`,
  mergeRevision: (rev: number) => `审阅修订 ${rev}`,
  mergeSuccess: (changesetId: string) => `已写入 Orders，并生成修订记录（${changesetId}）`,
  mergeConfirmed: (changesetId: string) => `已确认写入 Orders，并生成修订记录（${changesetId}）`,
  mergeNotConfirmed: "服务端尚未确认本批写入，请刷新后重试",

  // --- Snapshot table ---
  revisionLabel: (rev: number) => `r${rev}`,
  hasHistory: "有历史变更",
  initialValue: "初始值",
  noRevisionDetail: "暂无修订明细",
  revisionEntry: (rev: number) => `修订 ${rev}`,
  previousValueLabel: (qty: string) => `原值 ${qty}`,

  // --- Classification ---
  forecast: "Forecast",
  confirmed: "Firm",
} as const;

// --- Enum display labels ---
export const statusLabels: Record<RunStatus, string> = {
  queued: "排队中",
  running: "执行中",
  succeeded: "已完成",
  failed: "失败",
};

export const phaseLabels: Record<RunPhase, string> = {
  pending: "等待选择数据",
  ready: "数据已锁定",
  executing: "正在执行",
  completed: "执行完成",
};

export const modeLabels: Record<RunMode, string> = {
  test: "试运行",
  formal: "正式运行",
};

export const correctionStatusLabels: Record<CorrectionStatus, string> = {
  valid: "可合并",
  blocked: "异常",
  merged: "已合并",
};

export const correctionFilterLabels: Record<string, string> = {
  all: "全部",
  valid: "可合并",
  warning: "需确认",
  blocked: "异常",
  merged: "已合并",
};

export const sourceTypeLabels: Record<string, string> = {
  pipeline: "系统导入",
  manual_edit: "人工修改",
  skill_correction: "Skill 合并",
};
