# Backend Service Requirement 2.0 中文评审稿

Target project location: `server/docs/backend-service-2.0.zh-CN.md`

Status: Draft v0.1 review copy.

## 目的

这份文档是 `backend-service-2.0.md` 的中文评审稿，用来帮助业务和产品视角检查后端 service 是否覆盖了页面动作、业务流程、worker mock、审计和状态变化。

英文 service 名、collection 名、task type 名仍然是后续实现和 API contract 的标准命名。本中文稿主要用于理解和讨论。

## 现在是否写完

当前已经完成第一版 service matrix。

它已经覆盖：

- 8 个页面的主要 read model。
- 8 个页面可见按钮和动作。
- 每个动作调用哪个 backend service。
- 每个动作读哪些 collection。
- 每个动作写哪些 collection。
- 是否创建或更新 `processing_tasks`。
- 是否依赖 mock worker。
- 是否写 `audit_events`。

但它还没有完成到 endpoint 级别。

还没有定义：

- REST URL。
- request/response DTO。
- pagination/filter 具体字段。
- upload/download 具体协议。
- server-worker callback payload。
- 每个 service 的完整错误码。

这些应该放到后续 `backend-endpoint-2.0.md` 和 `backend-worker-mocked-2.0.md`。

## Service 是什么

这里的 service 指的是后端用例能力。

它不是页面按钮名，也不是 API URL，也不是数据库 CRUD。

一个 service 应该回答：

- 用户或系统想完成什么业务动作？
- 后端需要读哪些数据？
- 后端需要写哪些数据？
- 业务状态会怎么变化？
- 是否要调用 worker 或使用 mock worker？
- 是否要留下审计？
- 哪些情况必须阻止执行？

例子：

```text
ReviewDecisionService.confirmParsedResult
```

含义不是“一个按钮”，而是：

用户在解析审查页面确认 AI 解析结果后，后端把这个结果写入最终业务数据，比如 `sales_forecasts` 或 `shipping_plans`，同时保存人工决策和审计记录。

## 推荐的 Service 定义格式

后续如果展开每个 service，建议使用这个结构：

```text
Service Name
Purpose
Trigger
Input Command
Output Result
Records Read
Records Written
State Changes
Worker Mock Dependency
Audit Events
Guard Clauses
Errors
Refresh Hints
```

中文解释：

- `Service Name`：后端 service 名，比如 `ReviewDecisionService.confirmParsedResult`。
- `Purpose`：这个 service 的业务目的。
- `Trigger`：由哪个页面按钮、系统任务或 worker callback 触发。
- `Input Command`：调用时需要的核心输入字段。
- `Output Result`：返回给调用方的业务结果。
- `Records Read`：读取哪些 collection。
- `Records Written`：写入哪些 collection。
- `State Changes`：状态如何变化。
- `Worker Mock Dependency`：是否需要 mock worker。
- `Audit Events`：是否写审计，以及审计动作名。
- `Guard Clauses`：执行前必须满足的业务保护条件。
- `Errors`：典型错误码。
- `Refresh Hints`：前端成功后应该刷新哪些 read model。

## 全局规则

### 语言无关

这份 service 文档和 Java/Python 无关。

如果后端 server 用 Java，实现这些 service；如果 worker 用 Python，实现 worker task input/output。service contract 不绑定语言。

### 前端边界

前端只调用 server API。

前端不能直接调用：

- worker。
- LLM provider。
- MongoDB。
- object storage。
- queue。
- mailbox。

### Worker 边界

worker 输出是证据，不是最终业务真相。

worker 可以返回：

- 分类结果。
- 解析结果。
- 置信度。
- source references。
- trace steps。
- warnings/errors。

server 负责：

- 业务校验。
- 是否需要人工确认。
- 是否写入最终 `sales_forecasts` 或 `shipping_plans`。
- 状态变化。
- 审计。

### `isLatest` 规则

`processing_tasks` 需要 `isLatest`。

原因：

- 同一个邮件/附件/task type 可以重跑。
- 每次重跑创建新 task。
- 旧 task 作为历史保留。
- 当前有效 task 用 `isLatest = true`。

`sales_forecasts.weekQuantities[]` 和 `shipping_plans.lines[]` 不建议加 `isLatest`。

原因：

- 当前值直接存在 cell/line 上。
- 历史版本存在 `versions[]`。
- 用 `currentVersion` 指向当前版本。
- 这样前端查询当前表格更简单。

## 后端核心 collection

第一版 service 只围绕这 11 个 collection：

```text
users
customers
mailbox_configs
mail_messages
processing_tasks
sales_forecasts
shipping_plans
skill_definitions
reconciliation_jobs
file_artifacts
audit_events
```

注意：

- `ReviewTask` 在 service 名里只是“人工审查 read model/service 概念”。
- Domain 2.0 不单独创建 `review_tasks` collection。
- 人工审查状态和决策放在 `processing_tasks.status`、`reviewReason`、`humanDecisions[]`。

## 通用 Service

### `AuditService`

用途：

- 写不可变审计记录。

什么时候需要：

- 用户修改业务数据。
- 用户确认解析结果。
- 用户重跑解析。
- 用户上传文件。
- 用户导出文件。
- 用户修改配置。

写入：

- `audit_events`。

### `FileArtifactService`

用途：

- 管理文件元数据。
- 生成上传/下载地址。
- 检查 retention visibility。

读取：

- `file_artifacts`。
- 相关业务记录，比如 `mail_messages`、`reconciliation_jobs`。

写入：

- `file_artifacts`。
- 必要时写 `audit_events`。

### `ProcessingTaskService`

用途：

- 创建 task。
- 重跑 task。
- 取消 task。
- 查询 task 生命周期。

写入：

- `processing_tasks`。
- `audit_events`。

关键规则：

- 重跑创建新 task。
- 新 task `isLatest = true`。
- 旧 task `isLatest = false`。
- worker 相关 task 必须有 `correlationId`。

### `WorkerDispatchService`

用途：

- 把 server task 转成 worker request。
- 接收 mock 或真实 worker callback。

写入：

- `processing_tasks.aiResult`。
- `processing_tasks.traceSteps`。
- `processing_tasks.status`。
- `processing_tasks.reviewReason`。

关键规则：

- callback 按 `correlationId` 幂等处理。
- 未知 `correlationId` 拒绝。
- 低置信度、冲突、校验失败时进入 `waiting_human_decision`。

## 页面 Service Matrix 中文版

### 1. 智能客服工作台

页面目的：

- 看昨天 AI 处理情况。
- 看最近客户来信情况。
- 看今天客户邮件数量。
- 看哪些邮件阻塞流程。

主要 read model：

- `YesterdayOperationSummary`
- `CustomerMailActivity`
- `TodayCustomerMailCount`
- `MailAttentionItem`
- `MailListItem`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开工作台 | `DailyCockpitQueryService.getWorkspace` | 查询日常 cockpit 汇总 | 否 | 否 | 否 |
| 切换 30 天/今日视图 | `DailyCockpitQueryService.getMailActivity` 或前端状态 | 查询邮件热力或今日数量 | 否 | 否 | 否 |
| 点击热力格子 | `MailQueryService.listMailsByCustomerDate` | 查看某客户某天邮件列表 | 否 | 否 | 否 |
| 打开阻塞邮件 | `MailQueryService.getMailDetail` | 跳到邮件详情 | 否 | 否 | 否 |

需要你确认：

- 这个页面是否只做查看和跳转？
- 缺邮件提醒是否只显示，不在这个页面直接发送提醒？

### 2. 客户收件箱 / Mail Intake

页面目的：

- 查看所有已接收邮件。
- 查看原始邮件正文。
- 查看附件处理状态。
- 对失败附件重跑解析。
- 跳转到人工审查或数据表。

主要 read model：

- `CustomerMailFolder`
- `MailListItem`
- `MailMessageDetail`
- `AttachmentParseSummaryPanel`
- `AttachmentParseSummaryCard`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开收件箱 | `MailQueryService.getInboxWorkspace` | 查询邮件列表和默认详情 | 否 | 否 | 否 |
| 筛选/搜索邮件 | `MailQueryService.listInboxMails` | 按客户、日期、状态过滤邮件 | 否 | 否 | 否 |
| 选择邮件 | `MailQueryService.getMailDetail` | 查询原始邮件和附件摘要 | 否 | 否 | 否 |
| 手动同步邮箱 | `MailboxIngestionService.requestManualSync` | 请求立刻读邮箱 | 是，创建 `mailbox_sync` task | 可 mock mailbox adapter | 是 |
| 重跑附件解析 | `AttachmentProcessingService.rerunParse` | 对失败或指定附件重新解析 | 是，创建新 task | 是 | 是 |
| 打开关联审查任务 | `ReviewTaskQueryService.getTaskWorkspace` | 跳到人工审查 workspace | 否 | 否 | 否 |
| 下载原始附件 | `FileArtifactService.createDownloadUrl` | 下载源文件 | 可选 audit | 否 | 可选 |

需要你确认：

- 收件箱是否需要“手动上传邮件/附件”作为补充入口？
- 下载原始附件是否必须审计？
- 重跑是否只允许失败任务，还是用户可以对已完成任务也主动重跑？

### 3. 解析审查 / Human Intervention

页面目的：

- 处理需要人工判断的 task。
- 看源文件/邮件证据。
- 看 Agent 执行过程。
- 确认 skill、修正结果、判定重复/修订/无效。

主要 read model：

- `HumanInterventionTaskItem`
- `TaskSourcePreview`
- `AgentCopilotTimeline`
- `ParsedResultReview`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开审查队列 | `ReviewTaskQueryService.listHumanInterventionTasks` | 查询等待人工处理的 task | 否 | 否 | 否 |
| 选择 task | `ReviewTaskQueryService.getTaskWorkspace` | 查询源文件、timeline、决策区 | 否 | 否 | 否 |
| 查看结果对比 | `ReviewTaskQueryService.getParsedResultReview` | 查看 AI 解析结果和证据 | 否 | 否 | 否 |
| 查看修改提交历史 | `ReviewTaskQueryService.listResultCommits` | 查看每次单元格修改 commit | 否 | 否 | 否 |
| 提交单元格修改 | `ReviewDecisionService.commitParsedResultEdits` | 原子提交一组单元格修改并生成新 revision | 是 | 否 | 是 |
| 确认调用 skill | `ReviewDecisionService.confirmSkillAndContinue` | 允许 pipeline 使用推荐 skill 继续 | 是 | 是 | 是 |
| 切换 skill | `ReviewDecisionService.selectSkill` | 人工选择另一个 skill | 是 | 是 | 是 |
| 确认解析结果 | `ReviewDecisionService.confirmParsedResult` | 把结果写入最终业务表 | 是 | 否，消费已有结果 | 是 |
| 标记重复 | `ReviewDecisionService.markDuplicate` | 当前提交不写入业务表 | 是 | 否 | 是 |
| 标记修订 | `ReviewDecisionService.markRevision` | 作为对旧数据的修订写入 | 是 | 否 | 是 |
| 拒绝无效文件 | `ReviewDecisionService.rejectSource` | 标记 unsupported/invalid | 是 | 否 | 是 |
| 重试 task | `ProcessingTaskService.retry` | 新建一次处理尝试 | 是 | 是 | 是 |

单元格修改规则：

- 修改对象是 AI 结构化结果草稿，不修改原始附件。
- 一次提交可以包含多个 cell change，并生成不可变 commit。
- 提交必须携带页面加载时取得的 `baseResultRevision`。
- 如果 server 当前 `resultRevision` 已变化，返回 `resultRevisionConflict`，不得覆盖其他人的提交。
- 提交成功后 `resultRevision + 1`；确认解析结果时记录 `publishedResultRevision`。
- 原始 worker 输出、commit、human decision 和 audit event 都必须保留。
- 如果 UI 提供“修改并确认”一个按钮，后端仍需在同一事务内执行两个明确动作：先创建 commit，再发布这个新 revision。

需要你确认：

- “确认解析结果”是否必须经过人工，还是高置信度可以自动入库？
- 单次修改提交说明是否必填？建议必填；每个 cell 的独立原因可选。
- “标记修订”是否要和上一次提交做差异预览？
- skill 调用确认后，是继续 worker 流程，还是只记录建议？

### 4. 订单 / 标准在线表

页面目的：

- 查看标准 `Sales Forecast`。
- 查看标准 `Shipping Plan`。
- 看当前值和变化量。
- 打开单元格/行追溯。
- 手动调整标准值。
- 导出 Excel。

主要 read model：

- `SalesForecastTable`
- `ShippingPlanTable`
- `ValueLineage`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开 Sales Forecast | `SalesForecastQueryService.getTable` | 查询周维度预测表 | 否 | 否 | 否 |
| 打开 Shipping Plan | `ShippingPlanQueryService.getTable` | 查询日维度发货表 | 否 | 否 | 否 |
| 切换当前值/变化量 | table query 参数 | 切换展示模式 | 否 | 否 | 否 |
| 打开 lineage | `LineageQueryService.getValueLineage` | 从业务值追到 task/mail/file/audit | 否 | 否 | 否 |
| 手动修改 forecast 数量 | `SalesForecastService.manualEditQuantity` | 修改标准 forecast cell | 是 | 否 | 是 |
| 手动修改 shipping line | `ShippingPlanService.manualEditLine` | 修改标准 shipping line | 是 | 否 | 是 |
| 导出当前表 | `ExportService.exportOrderTable` | 导出当前筛选结果 | 是，创建 file artifact | 否 | 是 |
| 打开原始邮件/附件 | `MailQueryService.getMailDetail` / `FileArtifactService.createDownloadUrl` | 查看源证据 | 可选 audit | 否 | 可选 |

需要你确认：

- 手动修改是否允许 inline edit？
- 手动修改原因是否必填？
- 导出格式是内部标准模板，还是客户模板也要支持？
- 查看 lineage 是否需要审计？

### 5. 技能工坊 / Skill Studio

页面目的：

- 创建 skill。
- 用自然语言生成 skill 定义。
- 保存版本。
- 用历史文件 sandbox 测试。
- 用户确认后激活。

主要 read model：

- `SkillListItem`
- `SkillStudioDetail`
- `SkillVersionItem`
- `SkillSandboxPreview`
- `SkillExecution`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开 skill 页面 | `SkillStudioQueryService.getWorkspace` | 查询 skill 列表和详情 | 否 | 否 | 否 |
| 新建 draft | `SkillStudioService.createDraft` | 创建 skill 草稿 | 是 | 否 | 是 |
| 生成 skill | `SkillStudioService.requestGeneration` | 创建 `generate_skill_version` task | 是 | 是 | 是 |
| 保存草稿 | `SkillStudioService.saveDraft` | 更新 draft 内容 | 是 | 否 | 是 |
| 保存为新版本 | `SkillStudioService.saveNewVersion` | 新增不可变版本 | 是 | 否 | 是 |
| 执行 sandbox | `SkillStudioService.requestSandboxRun` | 创建 sandbox task | 是 | 是 | 是 |
| 查看 sandbox trace | `SkillStudioQueryService.getSandboxTrace` | 查看执行过程 | 否 | 否 | 否 |
| 确认 sandbox 结果 | `SkillStudioService.confirmSandboxResult` | 记录测试通过 | 是 | 否 | 是 |
| 激活版本 | `SkillStudioService.activateVersion` | 切换 activeVersionNumber | 是 | 否 | 是 |
| 停用 skill | `SkillStudioService.disableSkill` | status 改为 disabled | 是 | 否 | 是 |

需要你确认：

- skill 生成结果是否需要人工编辑？
- 激活是否只要求一次 sandbox 通过？
- skill 是否永远只给建议，不直接改业务数据？目前文档按“只建议”处理。

### 6. 客户画像 / Analytics

页面目的：

- 查看客户发货热力。
- 查看某周 shipping 明细。
- 查看预测演变曲线。
- 看 AI 分析建议。
- 追溯某个 forecast version 来源。

主要 read model：

- `CustomerProfileSummary`
- `CustomerShippingWeekHeatmap`
- `CustomerWeekDetail`
- `CustomerWeeklyForecastComparison`
- `CustomerMaterialProfile`
- `ForecastEvolutionSeries`
- `CustomerRecommendation`
- `ValueLineage`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开客户画像 | `CustomerAnalyticsQueryService.getWorkspace` | 查询客户列表和默认画像 | 否 | 否 | 否 |
| 选择客户 | `CustomerAnalyticsQueryService.getCustomerAnalytics` | 查询指定客户画像 | 否 | 否 | 否 |
| 切换年份/滚动窗口 | analytics query 参数 | 改变分析时间范围 | 否 | 否 | 否 |
| 选择周 | `CustomerAnalyticsQueryService.getWeekDetail` | 查询周详情 | 否 | 否 | 否 |
| 选择物料 | `CustomerAnalyticsQueryService.getForecastEvolution` | 查询预测演变 | 否 | 否 | 否 |
| 刷新画像 | `CustomerAnalyticsService.requestSnapshotRefresh` | 请求重新计算画像 | 是，创建 task | 可选 mock | 是 |
| 打开预测来源追溯 | `LineageQueryService.getValueLineage` | 追到邮件/附件/AI 结果 | 否 | 否 | 否 |

需要你确认：

- 客户画像是否需要持久化 cache？
- AI 推荐是否只是展示，不创建 skill、不改订单？目前文档按“只展示”处理。
- 刷新画像是否需要 worker，还是 server 聚合即可？

### 7. 财务对账

页面目的：

- 选择客户和期间。
- 上传客户侧对账 Excel。
- 预览上传文件。
- 与 `shipping_plans` 比较。
- 保存对账结果。
- 导出差异 PDF。

主要 read model：

- `ReconciliationWorkspace`
- `ReconciliationHistoryItem`
- `TargetFilePreviewRow`
- `ReconciliationComparisonRow`
- `ShippingPlanMatchDetail`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开对账页面 | `ReconciliationQueryService.getWorkspace` | 查询当前配置和历史 | 否 | 否 | 否 |
| 上传目标 Excel | `ReconciliationService.uploadTargetFile` | 存文件并创建 job | 是 | 可选 mock parse | 是 |
| 预览上传文件 | `ReconciliationQueryService.getTargetPreview` | 查看 Excel 解析预览 | 否 | 否 | 否 |
| 执行比较 | `ReconciliationService.executeComparison` | 和 shipping plan 做对账 | 是，写 comparisonLines | 视解析情况 | 是 |
| 打开 shipping 明细 | `ReconciliationQueryService.getShippingPlanMatchDetail` | 查看匹配到的 shipping 行 | 否 | 否 | 否 |
| 保存对账结果 | `ReconciliationService.saveResult` | 保存 job 状态 | 是 | 否 | 是 |
| 导出差异 PDF | `ReconciliationExportService.exportDifferencePdf` | 生成差异报告 | 是 | 可选 mock report | 是 |
| 归档历史项 | `ReconciliationService.archiveJob` | 归档/隐藏历史 job | 是 | 否 | 是 |

需要你确认：

- 上传后是否自动解析，还是用户点击执行比较时再解析？
- 导出 PDF 是否必须异步？
- 历史对账是否需要在 shipping plan 改变后提示 stale？
- 对账 job 是否允许删除，还是只能 archive？

### 8. 系统配置

页面目的：

- 管理客户基本信息。
- 管理客户识别规则。
- 管理提醒计划。
- 导入物料映射。
- 管理用户。
- 管理统一监听邮箱。

主要 read model：

- `CustomerConfigListItem`
- `CustomerConfigDetail`
- `MaterialImportPreview`
- `UserConfigItem`
- `UserConfigDetail`
- `MailboxConfigView`

主要 service：

| 页面动作 | Service | 业务含义 | 是否写数据 | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- |
| 打开配置 section | `SystemConfigQueryService.getSectionDetail` | 查询配置详情 | 否 | 否 | 否 |
| 新建客户 | `CustomerConfigService.createCustomer` | 新增 customer | 是 | 否 | 是 |
| 保存客户基本信息 | `CustomerConfigService.updateCustomer` | 修改客户资料 | 是 | 否 | 是 |
| 停用客户 | `CustomerConfigService.disableCustomer` | customer status 改为 inactive | 是 | 否 | 是 |
| 新增/停用识别规则 | `CustomerConfigService.updateRecognitionRules` | 修改 contacts/rules | 是 | 否 | 是 |
| 保存提醒计划 | `CustomerConfigService.updateSubmissionSchedule` | 修改 submissionSchedules | 是 | 否 | 是 |
| 导入物料映射 Excel | `MaterialMappingService.previewImport` | 上传并预览校验 | 是，先不改 mapping | 可选 mock parser | 是 |
| 确认物料映射导入 | `MaterialMappingService.confirmImport` | 写入 materialMappings | 是 | 否 | 是 |
| 新建用户 | `UserConfigService.createUser` | 新增 user | 是 | 否 | 是 |
| 保存用户 | `UserConfigService.updateUser` | 修改 user | 是 | 否 | 是 |
| 重置密码 | `UserConfigService.resetPassword` | 重置用户密码 | 是 | 否 | 是 |
| 启用/停用用户 | `UserConfigService.setUserStatus` | 修改用户状态 | 是 | 否 | 是 |
| 保存邮箱配置 | `MailboxConfigService.updateConfig` | 修改统一邮箱 | 是 | 否 | 是 |
| 测试邮箱连接 | `MailboxConfigService.testConnection` | 测试 adapter 健康 | 是，更新连接状态 | 可 mock adapter | 是 |
| 启用/停用邮箱 | `MailboxConfigService.setEnabled` | 修改邮箱启用状态 | 是 | 否 | 是 |

需要你确认：

- 第一版是否只支持一个 active mailbox？目前文档按“只支持一个”处理。
- 用户 role 是否只控制系统配置权限？目前文档按“第一版只控制配置页”处理。
- 物料映射导入是否必须 Excel？
- 物料映射重复时，是阻止导入还是允许人工选择覆盖？

## 第一版 Service Catalog

这些是建议的后端 service group：

| Service group | 责任 |
| --- | --- |
| `DailyCockpitQueryService` | 工作台汇总、邮件热力、阻塞列表。 |
| `MailQueryService` | 收件箱、邮件详情、附件摘要。 |
| `MailboxIngestionService` | 手动/定时邮箱同步。 |
| `AttachmentProcessingService` | 附件解析和重跑。 |
| `ReviewTaskQueryService` | 人工审查队列、源文件预览、timeline、结果对比。 |
| `ReviewDecisionService` | 人工确认、修正、重复/修订/拒绝处理。 |
| `SalesForecastQueryService` | Sales Forecast 表格查询。 |
| `SalesForecastService` | Forecast 写入和人工修改。 |
| `ShippingPlanQueryService` | Shipping Plan 表格查询。 |
| `ShippingPlanService` | Shipping Plan 写入和人工修改。 |
| `LineageQueryService` | 从业务值追溯到 task/mail/file/audit。 |
| `SkillStudioQueryService` | Skill 列表、详情、版本、sandbox trace。 |
| `SkillStudioService` | Skill 创建、生成、版本、测试、激活、停用。 |
| `CustomerAnalyticsQueryService` | 客户画像、热力、预测演变、推荐。 |
| `CustomerAnalyticsService` | 画像刷新任务。 |
| `ReconciliationQueryService` | 对账 workspace、预览、比较结果、shipping 明细。 |
| `ReconciliationService` | 上传、比较、保存、归档对账 job。 |
| `ReconciliationExportService` | 差异 PDF/report 导出。 |
| `SystemConfigQueryService` | 配置 read model。 |
| `CustomerConfigService` | 客户资料、识别规则、提醒计划。 |
| `MaterialMappingService` | 物料映射导入预览和确认。 |
| `UserConfigService` | 用户管理。 |
| `MailboxConfigService` | 统一邮箱配置和连接测试。 |
| `FileArtifactService` | 文件上传/下载/retention。 |
| `ProcessingTaskService` | task 生命周期和重跑规则。 |
| `WorkerDispatchService` | worker request 和 callback ingestion。 |
| `AuditService` | 不可变审计。 |

## 最需要你补充的信息

请优先看这些问题，因为它们会影响后面的 worker mock 和 endpoint contract：

- 高置信度解析结果是否可以自动入库，还是所有解析结果都必须人工确认？
- 人工修改 forecast/shipping 值时，原因是否必填？
- 重跑解析是否允许对 completed task 执行？
- 缺邮件提醒是否只生成内部提醒，还是第一版要支持发送邮件？
- 原始附件下载是否必须写 audit？
- Skill 是否永远只能给建议，不能直接改业务数据？
- 财务对账导出 PDF 是否必须异步？
- 系统第一版是否只支持一个 active mailbox？
- 用户权限第一版是否只控制系统配置页？
- 物料映射导入遇到重复/冲突时，是阻止、跳过，还是人工选择覆盖？

## 建议下一步

先用这份中文稿过一遍业务动作和遗漏。

确认 service matrix 后，再写：

```text
backend-worker-mocked-2.0.md
backend-endpoint-2.0.md
```

这样后面实现 Java server 或 Python worker 时，大家都按同一份 contract 做，不会各自发明业务行为。
