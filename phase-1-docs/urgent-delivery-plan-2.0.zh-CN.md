# Phase 1 紧急上线交付计划 2.0

Status: Draft v0.2.

## 1. 本次目标

本次不以一次性完成全部 Supply Chain Agent 为目标，而是尽快上线一条可用、可审计、可继续扩展的订单处理主链路。

必须上线的业务页面：

1. `00-intelligent-service.html`：智能客服工作台。
2. `01-task-workbench.html`：客户收件箱 / 任务工作台。
3. `02-parse-review.html`：解析审查与人工修正。
4. `03-orders.html`：标准订单输出表。

这些页面依赖 `07-system-settings.html` 提供最小可运行配置，但系统配置页不需要在第一批完成所有设计能力。

Phase 1 上线主链路：

```text
配置客户、邮箱和物料映射
  -> 收取并保存邮件/附件
  -> 创建解析任务
  -> worker 或 mock worker 返回结构化结果
  -> 低置信度/冲突结果进入解析审查
  -> 用户按单元格修正并提交
  -> server 写入标准 Sales Forecast / Shipping Plan
  -> Orders 页面查询、追溯和导出
```

## 2. 当前真实状态

当前仓库更接近产品与技术 POC，不是可直接上线的生产系统。

已经具备：

- 2.0 后端领域模型和 service matrix 初稿。
- 3.0 静态 HTML 原型，覆盖目标页面和系统配置页面。
- 一套旧版 Next.js POC 页面和局部 Excel/PDF/LLM 演示能力。
- 单元格历史、人工修改、审计、worker/server 边界等设计基础。

尚未具备：

- 独立可部署的生产 `frontend`、`server`、`worker`。
- 完整 API、worker callback 和错误码合同。
- 数据库 repository、迁移/初始化、真实持久化和对象存储。
- 登录、权限、会话和配置写权限。
- 真实邮箱接入、定时同步、幂等和重复邮件处理。
- 可替换 mock 的稳定 worker 请求/回调协议。
- 目标四页对应的生产级前端实现与 API 集成。
- 单元格编辑提交、冲突检测和不可变修改历史。
- 自动化测试、部署流水线、监控、告警和上线回滚方案。

结论：页面原型已经比较清楚，但生产实现仍处于启动前阶段。当前最大的风险不是 UI 开发速度，而是接口合同、业务真值写入规则和并发修改规则还未冻结。

## 3. 必须立即冻结的范围

### 3.1 Phase 1 必须做

- 一个 active 统一邮箱，支持手动同步和定时同步。
- 客户基础信息、发件人识别规则、催发周期、物料映射。
- 用户登录；`admin` 可写系统配置，业务用户可使用四个业务页面。
- 邮件与附件不可变保存、下载和基础追溯。
- 附件任务状态、失败重试、人工审查队列。
- Sales Forecast 和 Shipping Plan 两种标准结果。
- 解析审查中的单元格级修改、提交记录和并发冲突处理。
- Orders 当前值、变化量、单元格/行历史、Excel 导出。
- 所有数据修改操作写不可变 `audit_events`。
- mock worker 与真实 worker 使用同一合同，允许先 mock 联调。

### 3.2 Phase 1 明确延后

- 技能工坊、客户画像、财务对账正式上线。
- 多邮箱、多租户和复杂业务页权限。
- 在浏览器中修改原始 Excel/PDF 文件。
- 实时多人协同光标、在线锁和自动合并编辑。
- 高级提醒邮件自动发送。
- 多语言、复杂运营报表和审计日志导出。

### 3.3 系统配置页最小范围

`07-system-settings.html` 第一批只实现以下能力：

| 配置区 | Phase 1 必须能力 | 可延后 |
| --- | --- | --- |
| 客户配置 | 新增/修改/停用客户 | 批量管理与复杂层级 |
| 发件人识别 | email、domain、subject keyword 规则 | 自学习权重 |
| 催发周期 | weekly 计划、期望时间、grace hours | 自动发送提醒 |
| 物料映射 | Excel 导入预览、冲突提示、确认导入 | 高级映射工作流 |
| 用户管理 | 新增、停用、角色、重置密码 | 细粒度页面/字段权限 |
| 统一邮箱 | 一个 active mailbox、测试连接、启停 | 多邮箱与路由策略 |

## 4. 页面依赖与交付顺序

| 页面 | 必须先有的后端能力 | 主要阻塞项 |
| --- | --- | --- |
| 智能客服 | 客户、邮件、任务、催发周期 read model | 邮箱同步和配置数据 |
| 客户收件箱 | 邮件/附件存储、任务状态、下载、重试 | 对象存储和任务编排 |
| 解析审查 | worker 结果、源文件预览、人工决策、编辑提交 | worker contract 和并发规则 |
| Orders | 标准业务表、版本历史、lineage、导出 | 解析确认后的业务真值写入 |
| 系统配置 | 用户、客户、邮箱、物料映射 CRUD | auth、权限和配置校验 |

推荐开发顺序：

1. 冻结领域规则、worker mock contract 和 API contract。
2. 建立 server 基础设施、auth、审计、文件和数据库。
3. 优先实现系统配置最小能力。
4. 实现邮件入库、附件任务和 mock worker 闭环。
5. 并行开发客户收件箱、解析审查和 Orders。
6. 最后接智能客服聚合 read model。
7. 用真实 worker 替换 mock adapter，不改变 frontend API。

## 5. 解析审查的单元格级提交设计

### 5.1 设计决策

3.0 原型中“结果对比只读”的约束被本次需求替换。

解析审查页面允许修改的是 **AI 结构化结果草稿**，不是原始附件，也不是已发布的标准订单数据。用户完成一组修改后，必须通过一次“提交修改并确认结果”操作原子提交。

Orders 页面仍可修改已经发布的标准业务值，但它是发布后的二次调整，使用独立的业务值版本历史。

### 5.2 GitHub-like 提交语义

一次 review commit 包含：

```text
commitId
processingTaskId
baseResultRevision
resultRevision
authorUserId
message
changes[]
createdAt
```

每个 `changes[]` 项包含：

```text
rowId
fieldPath
oldValue
newValue
reason
sourceReferenceIds[]
```

规则：

- 页面加载时取得 `baseResultRevision`。
- 用户可以在前端暂存多个单元格修改。
- 提交时必须携带 `baseResultRevision`、提交说明和全部 changes。
- server 在一个事务内校验、写入新 revision、保存 review commit、写 human decision 和 audit event。
- 历史 commit 不可修改或删除。
- 原始 worker 输出不可覆盖；当前审查结果由原始输出加已接受 commit 计算或生成快照。

### 5.3 防止覆盖他人提交

Phase 1 使用乐观并发控制，不实现实时锁。

```text
客户端提交 baseResultRevision = 7
server 当前 resultRevision = 7
  -> 提交成功，生成 resultRevision = 8

客户端提交 baseResultRevision = 7
server 当前 resultRevision = 8
  -> 返回 HTTP 409 resultRevisionConflict
  -> 返回最新 revision 和冲突后变化的单元格
  -> 前端要求用户刷新、检查并重新提交
```

这会阻止静默覆盖。即使两个人修改不同单元格，旧 revision 的提交也先冲突；Phase 1 选择可解释和安全，暂不自动合并。

### 5.4 发布到标准业务表

- “保存草稿”只创建 review commit，不完成 task，不写标准业务表。
- “提交修改并确认结果”创建最后一个 review commit，并尝试发布到 `sales_forecasts` 或 `shipping_plans`。
- 发布必须校验客户、物料映射、必填字段和 task 最新状态。
- 发布成功后 task 变为 `completed`，并记录发布使用的 `resultRevision`。
- 对已经完成的 task 再修改时，必须创建新的 review/revision 流程，不能直接篡改旧 task。

### 5.5 最小 API

```text
GET  /api/review-tasks/{taskId}/result
POST /api/review-tasks/{taskId}/commits
POST /api/review-tasks/{taskId}/confirm
GET  /api/review-tasks/{taskId}/commits
```

`POST /commits` 最少需要：

```text
baseResultRevision
message
changes[]
```

典型错误：

- `resultRevisionConflict`
- `taskNotLatest`
- `taskNotEditable`
- `invalidCellPath`
- `valueValidationFailed`
- `materialMappingMissing`
- `reviewReasonRequired`

## 6. 剩余工作量

以下为生产试点版的粗估，单位为人日，假设需求范围按本文冻结、已有原型可复用、基础云资源可及时提供。

| 工作包 | 主要产出 | 估算 |
| --- | --- | ---: |
| 合同与决策冻结 | worker mock、API、错误码、状态机、验收标准 | 5-8 |
| Server 基础 | auth、MongoDB、对象存储、审计、通用错误、部署配置 | 10-15 |
| 系统配置最小版 | 客户、规则、周期、物料映射、用户、邮箱 | 10-14 |
| 邮件与任务主链路 | 邮箱同步、幂等、附件、任务编排、重试 | 12-18 |
| Worker 合同与解析 | mock adapter、真实 Excel/PDF 解析接入、回调 | 15-25 |
| 四个目标页面 | 生产 UI、API client、状态与错误处理 | 20-28 |
| 单元格提交与版本 | review commit、冲突处理、历史、发布 | 8-12 |
| 测试与上线 | 单元/集成/E2E、数据准备、监控、回滚、UAT | 12-18 |
| **总计** | 不含技能工坊/画像/对账 | **92-138 人日** |

时间判断：

- 只做 mock worker 的内部演示闭环：约 3-4 周。
- 4-5 人并行做生产试点版：约 6-8 周。
- 少于 3 名全职开发时，不建议承诺 6 周内稳定上线。

估算不包含 Microsoft Graph 审批延迟、云资源采购/安全审批、历史数据清洗和真实客户模板大量变体；这些外部因素可能增加工期。

推荐最小团队分工：

- 1 名 backend/tech lead：冻结合同并负责业务真值、审计、并发和任务编排。
- 1 名 backend/integration：负责邮箱、文件、配置和基础设施集成。
- 1-2 名前端：按稳定 API 并行完成四页和系统配置最小版。
- 1 名 worker/AI：负责 mock contract、真实解析和回调幂等。
- QA/DevOps 能力至少兼职投入，不能等开发结束后才开始。

## 7. 两周启动计划

### 第 1 周：冻结合同并跑通骨架

- 确认本文 Phase 1 范围和延后项。
- 完成 `backend-worker-mocked-2.0.md`。
- 完成四页和系统配置所需的 `backend-endpoint-2.0.md`。
- 定义 review commit、409 冲突和 audit event schema。
- 创建生产项目结构和环境配置。
- 跑通 auth、MongoDB、对象存储、健康检查和部署骨架。
- 准备 5-10 组真实脱敏邮件/附件作为验收数据。

### 第 2 周：跑通第一条端到端链路

- 完成客户、物料映射、邮箱最小配置 API。
- 手动同步一封邮件并保存附件。
- 创建 parse task，并由 mock worker 返回 forecast/shipping 结果。
- 在解析审查页面修改一个单元格并创建 commit。
- 确认结果并写入标准业务表。
- 在 Orders 页面看到当前值、历史和来源。
- 增加这条主链路的集成测试和 E2E 冒烟测试。

两周结束时的判断标准不是页面完成度，而是主链路是否真正写入、可追溯、可冲突保护地跑通。

## 8. 上线门槛

上线前必须满足：

- 邮件重复同步不会重复创建业务结果。
- worker callback 幂等，重复 callback 不重复发布。
- 解析审查并发提交不会覆盖他人修改。
- 每个手动修改都能看到用户、时间、原值、新值、原因和 commit。
- Orders 当前值能追溯到 task、邮件、附件和 source reference。
- 配置修改、重试、人工确认、导出均有审计记录。
- 关键失败路径有清晰错误和可恢复动作。
- 有一套脱敏验收数据、部署手册、回滚步骤和生产监控。

## 9. 当前最需要确认的业务决定

以下问题应在开发启动后的 2 个工作日内确认，否则会阻塞合同：

1. 高置信度结果是否允许自动发布；建议 Phase 1 允许配置开关，默认人工确认。
2. 人工修改原因是否必填；建议所有单元格修改必填提交说明，单个 cell reason 可选。
3. completed task 是否允许重跑；建议允许，但必须创建新 task/revision，旧结果不可变。
4. 物料映射冲突如何处理；建议阻止确认导入并要求人工选择。
5. 第一版真实邮箱 provider；需要尽快确认 Microsoft Graph、IMAP 或其他方式。

除邮箱 provider 需要外部信息外，如 2 个工作日内没有异议，其余问题建议直接按上述推荐作为 Phase 1 默认决策。
