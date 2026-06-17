# Backend Service Requirement 2.0

Target project location: `server/docs/backend-service-2.0.md`

Status: Draft v0.1.

## Purpose

This document defines the backend service layer for Supply Chain Agent based on `backend-domain-requirement-2.0.md`.

The domain model document remains the source of truth for MongoDB collections and embedded records. This service document describes how frontend page actions, backend use cases, worker mock dependencies, and audit requirements map onto that model.

This document intentionally does not define REST endpoint paths. Endpoint paths, request DTOs, response DTOs, pagination, upload/download, and callback formats belong to `backend-endpoint-2.0.md`.

## Inputs

Authoritative inputs:

- `backend-domain-requirement-2.0.md` / `domain-requirement-2.0.md` for the 11 MongoDB collections.
- `frontend-requirement.md` for page goals, read models, and user actions.
- `html prototype 2.0` for visible buttons, panels, sheets, dialogs, and action affordances.

Prototype 3.0 currently changes CSS only and does not change the service matrix.

## Service Design Rules

- Backend services are business use cases, not controller methods.
- Frontend only calls server APIs; it never calls worker, database, object storage, mailbox, or queue directly.
- Worker output is evidence. Server services decide whether to persist final business truth.
- Every data-changing service must define records read, records written, guard clauses, and audit behavior.
- Every worker-dependent service must be runnable with a mocked worker result in the first implementation.
- Every rerun creates a new `processing_tasks` record with `isLatest = true`; older attempts for the same source and task type become `isLatest = false`.
- `sales_forecasts.weekQuantities[]` and `shipping_plans.lines[]` store current visible values directly and keep history in `versions[]`; do not add `isLatest` inside those embedded version arrays.
- Query/read model services may compute data from collections at request time. They should not create persistent collections unless performance later requires cache snapshots.
- Service names containing `ReviewTask` are read model/service names over `processing_tasks`; they do not imply a separate `review_tasks` collection in Domain 2.0.

## Core Collections

Backend services are limited to these first-version collections:

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

## Service Result Types

### Query Result

Used by read model services.

```text
type
data
generatedAt
sourceCollections[]
```

Rules:

- Query results do not write audit events in the first version unless the query exposes sensitive raw files or exports.
- Query result shape can later map directly to endpoint response DTOs.

### Command Result

Used by synchronous data-changing services.

```text
type
entityType
entityId
status
message
auditEventId?
refreshHints[]
```

Rules:

- `refreshHints[]` tells frontend which read models should be refreshed after success.
- The endpoint document should keep this concept, even if exact field names change.

### Async Accepted Result

Used when a service creates a task or export job.

```text
type
taskId
correlationId
status
estimatedNextState?
refreshHints[]
```

Rules:

- The server can return immediately after creating `processing_tasks`.
- Worker callbacks or server-side jobs update the task later.

## Cross-Cutting Services

### `AuditService`

Purpose:

- Append immutable `audit_events` for data-changing user/system actions.

Reads:

- Target entity before/after data when available.

Writes:

- `audit_events`.

Rules:

- Manual corrections must be written both to business context (`processing_tasks.humanDecisions[]` or business record `versions[]`) and immutable `audit_events`.
- Read-only dashboard and analytics queries do not require audit in the first version.

### `FileArtifactService`

Purpose:

- Store file metadata, resolve upload/download URLs, and enforce retention visibility.

Reads:

- `file_artifacts`, related owner records such as `mail_messages`, `reconciliation_jobs`, or export records.

Writes:

- `file_artifacts` for uploads, exports, reports, and generated artifacts.
- `audit_events` for uploads, downloads of raw evidence when required, exports, and report generation.

Worker/mock dependency:

- No direct worker dependency.

### `ProcessingTaskService`

Purpose:

- Create, rerun, cancel, and query backend task lifecycle records.

Reads:

- Source records such as `mail_messages`, `file_artifacts`, `skill_definitions`, `reconciliation_jobs`.
- Existing latest `processing_tasks`.

Writes:

- `processing_tasks`.
- `audit_events`.

Rules:

- Rerun creates a new task with `parentTaskId`, incremented `attemptNo`, and `isLatest = true`.
- Previous latest task for the same `mailMessageId + attachmentId + taskType` becomes `isLatest = false`.
- Worker-dependent tasks must include `correlationId`.

### `WorkerDispatchService`

Purpose:

- Convert backend tasks into worker requests and ingest mocked or real worker callbacks.

Reads:

- `processing_tasks`, `mail_messages`, `file_artifacts`, `customers`, `skill_definitions`.

Writes:

- `processing_tasks.aiResult`, `processing_tasks.traceSteps`, `processing_tasks.status`, `processing_tasks.reviewReason`.
- Business records only through downstream domain services after validation.

Rules:

- Worker callbacks must be idempotent by `correlationId`.
- Unknown `correlationId` callbacks are rejected.
- Low confidence, ambiguous result, validation failure, or conflict moves the task to `waiting_human_decision`.

## Page Service Matrix

### 1. Intelligent Customer Service Workspace

Page read models:

- `YesterdayOperationSummary`
- `CustomerMailActivity`
- `TodayCustomerMailCount`
- `MailAttentionItem`
- `MailListItem` for the activity side sheet

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open dashboard | `DailyCockpitQueryService.getWorkspace` | `customers`, `mail_messages`, `processing_tasks`, `sales_forecasts`, `shipping_plans` | none | no | no | no |
| Switch 30-day/today mail view | Frontend state or `DailyCockpitQueryService.getMailActivity` | `customers`, `mail_messages`, `processing_tasks` | none | no | no | no |
| Click heatmap cell | `MailQueryService.listMailsByCustomerDate` | `customers`, `mail_messages`, `processing_tasks` | none | no | no | no |
| Open mail attention item | `MailQueryService.getMailDetail` | `mail_messages`, `processing_tasks`, `file_artifacts` | none | no | no | no |

Notes:

- Missing expected mail is computed from `customers.submissionSchedules[]` and mail history.
- The dashboard does not resolve review tasks directly; resolution happens in Customer Inbox or Parse Review.

### 2. Customer Inbox / Mail Intake

Page read models:

- `CustomerMailFolder`
- `MailListItem`
- `MailMessageDetail`
- `AttachmentParseSummaryPanel`
- `AttachmentParseSummaryCard`

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open inbox | `MailQueryService.getInboxWorkspace` | `customers`, `mail_messages`, `processing_tasks` | none | no | no | no |
| Filter/search mail list | `MailQueryService.listInboxMails` | `customers`, `mail_messages`, `processing_tasks` | none | no | no | no |
| Select mail | `MailQueryService.getMailDetail` | `mail_messages`, `processing_tasks`, `file_artifacts` | none | no | no | no |
| Manual mailbox sync | `MailboxIngestionService.requestManualSync` | `mailbox_configs` | `processing_tasks`, `audit_events` | `mailbox_sync` queued | optional adapter mock | yes |
| Rerun attachment parse | `AttachmentProcessingService.rerunParse` | `mail_messages`, `file_artifacts`, latest `processing_tasks` | `processing_tasks`, `audit_events` | `classify_document`, then extraction task queued | yes | yes |
| Open related review task | `ReviewTaskQueryService.getTaskWorkspace` | `processing_tasks`, `mail_messages`, `file_artifacts` | none | no | no | no |
| Download original attachment | `FileArtifactService.createDownloadUrl` | `file_artifacts`, `mail_messages` | optional `audit_events` | no | no | optional |

Guard clauses:

- Manual sync requires one enabled `mailbox_configs` record.
- Rerun is allowed only for failed, cancelled, or explicitly user-selected latest tasks.
- Download requires file artifact visibility under retention rules.

### 3. Parse Review / Human Intervention

Page read models:

- `HumanInterventionTaskItem`
- `TaskSourcePreview`
- `AgentCopilotTimeline`
- `ParsedResultReview`

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open review queue | `ReviewTaskQueryService.listHumanInterventionTasks` | `processing_tasks`, `mail_messages`, `customers` | none | no | no | no |
| Select task | `ReviewTaskQueryService.getTaskWorkspace` | `processing_tasks`, `mail_messages`, `file_artifacts`, `customers`, `skill_definitions` | none | no | no | no |
| View result comparison | `ReviewTaskQueryService.getParsedResultReview` | `processing_tasks.aiResult`, `mail_messages`, `file_artifacts` | none | no | no | no |
| List parsed-result commits | `ReviewTaskQueryService.listResultCommits` | `processing_tasks.reviewCommits[]`, `users`, `audit_events` | none | no | no | no |
| Commit parsed cell edits | `ReviewDecisionService.commitParsedResultEdits` | `processing_tasks.aiResult`, `reviewCommits[]`, `customers` | `processing_tasks.reviewCommits[]`, `humanDecisions[]`, `resultRevision`, `audit_events` | current task remains waiting for decision | no new worker | yes |
| Confirm skill and continue | `ReviewDecisionService.confirmSkillAndContinue` | `processing_tasks`, `skill_definitions` | `processing_tasks.humanDecisions[]`, `audit_events` | follow-up task may be queued | yes | yes |
| Switch selected skill | `ReviewDecisionService.selectSkill` | `processing_tasks`, `skill_definitions` | `processing_tasks.humanDecisions[]`, `audit_events` | follow-up task may be queued | yes | yes |
| Confirm parsed result | `ReviewDecisionService.confirmParsedResult` | `processing_tasks.aiResult`, `customers` | `processing_tasks.humanDecisions[]`, `sales_forecasts` or `shipping_plans`, `audit_events` | current task completed | no new worker | yes |
| Mark duplicate | `ReviewDecisionService.markDuplicate` | `processing_tasks`, `mail_messages` | `processing_tasks.humanDecisions[]`, `audit_events` | current task completed/cancelled | no | yes |
| Mark revised submission | `ReviewDecisionService.markRevision` | `processing_tasks`, previous business records | `processing_tasks.humanDecisions[]`, `sales_forecasts` or `shipping_plans`, `audit_events` | current task completed | no | yes |
| Reject unsupported/invalid file | `ReviewDecisionService.rejectSource` | `processing_tasks`, `file_artifacts` | `processing_tasks.humanDecisions[]`, `audit_events` | current task completed/failed | no | yes |
| Retry task | `ProcessingTaskService.retry` | `processing_tasks`, source records | `processing_tasks`, `audit_events` | new latest task queued | yes | yes |

Guard clauses:

- A task can be resolved only when its latest status is `waiting_human_decision`.
- Business record writes must validate customer/material mapping before final persistence.
- Skill confirmation must not directly mutate final business data; it only allows the pipeline to continue or produce recommendations.
- Parsed-result edit commits require `baseResultRevision` to equal the current task `resultRevision`; stale commits fail with `resultRevisionConflict`.
- A commit applies all cell changes atomically and must never mutate the original attachment or erase the original worker result.
- Confirming the parsed result publishes the current `resultRevision` and stores it as `publishedResultRevision`.
- A user who edits and confirms in one UI action still triggers the same two domain operations in one transaction: create the review commit, then publish that exact new revision.

### 4. Orders / Standard Online Tables

Page read models:

- `SalesForecastTable`
- `ShippingPlanTable`
- `ValueLineage`

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open Sales Forecast tab | `SalesForecastQueryService.getTable` | `customers`, `sales_forecasts` | none | no | no | no |
| Open Shipping Plan tab | `ShippingPlanQueryService.getTable` | `customers`, `shipping_plans` | none | no | no | no |
| Switch current/delta view | query parameter on table service | `sales_forecasts`, `shipping_plans` | none | no | no | no |
| Open cell/line lineage | `LineageQueryService.getValueLineage` | business record, `processing_tasks`, `mail_messages`, `file_artifacts`, `audit_events` | none | no | no | no |
| Manual edit forecast quantity | `SalesForecastService.manualEditQuantity` | `sales_forecasts`, `processing_tasks` | `sales_forecasts.weekQuantities[]`, `versions[]`, `audit_events` | no | no | yes |
| Manual edit shipping line | `ShippingPlanService.manualEditLine` | `shipping_plans`, `processing_tasks` | `shipping_plans.lines[]`, `versions[]`, `audit_events` | no | no | yes |
| Export current table | `ExportService.exportOrderTable` | current table source records | `file_artifacts`, `audit_events` | optional export task | no | yes |
| Open original mail/file from lineage | `FileArtifactService.createDownloadUrl` and `MailQueryService.getMailDetail` | `mail_messages`, `file_artifacts` | optional `audit_events` | no | no | optional |

Guard clauses:

- Manual edits update standardized business records only, never source email or attachments.
- Manual edit history must preserve previous value, new value, user, timestamp, and reason when provided.
- Export uses the current filtered read model at export time.

### 5. Skill Studio

Page read models:

- `SkillListItem`
- `SkillStudioDetail`
- `SkillVersionItem`
- `SkillSandboxPreview`
- `SkillExecution`

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open skill list/detail | `SkillStudioQueryService.getWorkspace` | `skill_definitions`, `customers` | none | no | no | no |
| Create skill draft | `SkillStudioService.createDraft` | `customers` | `skill_definitions`, `audit_events` | no | no | yes |
| Generate skill | `SkillStudioService.requestGeneration` | `skill_definitions`, `customers` | `processing_tasks`, `audit_events` | `generate_skill_version` queued | yes | yes |
| Save draft | `SkillStudioService.saveDraft` | `skill_definitions` | `skill_definitions`, `audit_events` | no | no | yes |
| Save as new version | `SkillStudioService.saveNewVersion` | `skill_definitions` | `skill_definitions.versions[]`, `audit_events` | no | no | yes |
| Execute sandbox | `SkillStudioService.requestSandboxRun` | `skill_definitions`, `mail_messages`, `processing_tasks` | `processing_tasks`, `audit_events` | `execute_skill_sandbox` queued | yes | yes |
| View sandbox trace | `SkillStudioQueryService.getSandboxTrace` | `processing_tasks.traceSteps`, `processing_tasks.aiResult` | none | no | no | no |
| Confirm sandbox result | `SkillStudioService.confirmSandboxResult` | `skill_definitions`, `processing_tasks` | `skill_definitions.testRuns[]`, `audit_events` | no | no | yes |
| Activate skill version | `SkillStudioService.activateVersion` | `skill_definitions.testRuns[]` | `skill_definitions.activeVersionNumber`, `audit_events` | no | no | yes |
| Disable skill | `SkillStudioService.disableSkill` | `skill_definitions` | `skill_definitions.status`, `audit_events` | no | no | yes |

Guard clauses:

- Activating a version requires at least one user-confirmed sandbox test.
- Historical versions are immutable.
- Active skills produce recommendations and trace evidence; they do not directly mutate final business records.

### 6. Customer Profile And Analytics

Page read models:

- `CustomerProfileSummary`
- `CustomerShippingWeekHeatmap`
- `CustomerWeekDetail`
- `CustomerWeeklyForecastComparison`
- `CustomerMaterialProfile`
- `ForecastEvolutionSeries`
- `CustomerRecommendation`
- `ValueLineage` or analytics-specific trace

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open customer profile page | `CustomerAnalyticsQueryService.getWorkspace` | `customers`, `sales_forecasts`, `shipping_plans` | none | no | no | no |
| Select customer | `CustomerAnalyticsQueryService.getCustomerAnalytics` | `customers`, `sales_forecasts`, `shipping_plans` | none | no | no | no |
| Switch year/rolling window | query parameter on analytics service | `sales_forecasts`, `shipping_plans` | none | no | no | no |
| Select week | `CustomerAnalyticsQueryService.getWeekDetail` | `sales_forecasts`, `shipping_plans` | none | no | no | no |
| Select material | `CustomerAnalyticsQueryService.getForecastEvolution` | `sales_forecasts`, `shipping_plans` | none | no | no | no |
| Refresh analytics | `CustomerAnalyticsService.requestSnapshotRefresh` | `customers`, business records | `processing_tasks`, `audit_events` | analytics refresh queued | optional mock | yes |
| Open forecast source trace | `LineageQueryService.getValueLineage` | business record, `processing_tasks`, `mail_messages`, `file_artifacts` | none | no | no | no |

Guard clauses:

- Analytics recommendations are display-only.
- Recommendations must not automatically create skills, modify orders, or change standardized tables.
- Persistent analytics cache is optional and should be introduced only for performance.

### 7. Financial Reconciliation

Page read models:

- `ReconciliationWorkspace`
- `ReconciliationHistoryItem`
- `TargetFilePreviewRow`
- `ReconciliationComparisonRow`
- `ShippingPlanMatchDetail`

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open reconciliation workspace | `ReconciliationQueryService.getWorkspace` | `customers`, `reconciliation_jobs` | none | no | no | no |
| Upload target Excel | `ReconciliationService.uploadTargetFile` | `customers` | `file_artifacts`, `reconciliation_jobs`, `audit_events` | optional `extract_reconciliation` queued | optional mock | yes |
| Preview uploaded target | `ReconciliationQueryService.getTargetPreview` | `reconciliation_jobs`, `file_artifacts`, `processing_tasks` | none | no | no | no |
| Execute comparison | `ReconciliationService.executeComparison` | `reconciliation_jobs`, `shipping_plans` | `reconciliation_jobs.comparisonLines[]`, `audit_events` | no, unless target parse is pending | optional mock if parse needed | yes |
| Open shipping detail | `ReconciliationQueryService.getShippingPlanMatchDetail` | `reconciliation_jobs`, `shipping_plans` | none | no | no | no |
| Save reconciliation result | `ReconciliationService.saveResult` | `reconciliation_jobs` | `reconciliation_jobs.status`, `audit_events` | no | no | yes |
| Export difference PDF | `ReconciliationExportService.exportDifferencePdf` | `reconciliation_jobs`, `file_artifacts` | `file_artifacts`, `audit_events` | optional export task | optional mock report generator | yes |
| Archive history item | `ReconciliationService.archiveJob` | `reconciliation_jobs` | `reconciliation_jobs.status`, `audit_events` | no | no | yes |

Guard clauses:

- Customer and period/date range are required before upload.
- Upload supports Excel only in the first version.
- Comparison result is a snapshot and must not mutate `shipping_plans`.
- Export uses stored comparison lines, not live recomputation.

### 8. System Configuration

Page read models:

- `CustomerConfigListItem`
- `CustomerConfigDetail`
- `MaterialImportPreview`
- `UserConfigItem`
- `UserConfigDetail`
- `MailboxConfigView`

Services:

| UI action | Backend service | Records read | Records written | Processing task | Worker/mock | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Open config section | `SystemConfigQueryService.getSectionDetail` | `users`, `customers`, `mailbox_configs` | none | no | no | no |
| Create customer | `CustomerConfigService.createCustomer` | `customers` | `customers`, `audit_events` | no | no | yes |
| Save customer basic info | `CustomerConfigService.updateCustomer` | `customers` | `customers`, `audit_events` | no | no | yes |
| Disable customer | `CustomerConfigService.disableCustomer` | `customers` | `customers`, `audit_events` | no | no | yes |
| Add/disable sender rule | `CustomerConfigService.updateRecognitionRules` | `customers` | `customers.contacts[]`, `audit_events` | no | no | yes |
| Save reminder schedule | `CustomerConfigService.updateSubmissionSchedule` | `customers` | `customers.submissionSchedules[]`, `audit_events` | no | no | yes |
| Import material mapping Excel | `MaterialMappingService.previewImport` | `customers`, `file_artifacts` | `file_artifacts`, `audit_events` | optional parse task | optional mock parser | yes |
| Confirm material mapping import | `MaterialMappingService.confirmImport` | import preview artifact, `customers` | `customers.materialMappings[]`, `audit_events` | no | no | yes |
| Create user | `UserConfigService.createUser` | `users` | `users`, `audit_events` | no | no | yes |
| Save user | `UserConfigService.updateUser` | `users` | `users`, `audit_events` | no | no | yes |
| Reset password | `UserConfigService.resetPassword` | `users` | `users`, `audit_events` | no | no | yes |
| Enable/disable user | `UserConfigService.setUserStatus` | `users` | `users`, `audit_events` | no | no | yes |
| Save mailbox config | `MailboxConfigService.updateConfig` | `mailbox_configs` | `mailbox_configs`, `audit_events` | no | no | yes |
| Test mailbox connection | `MailboxConfigService.testConnection` | `mailbox_configs` | `mailbox_configs`, `audit_events` | no | optional adapter mock | yes |
| Enable/disable mailbox | `MailboxConfigService.setEnabled` | `mailbox_configs` | `mailbox_configs`, `audit_events` | no | no | yes |

Guard clauses:

- First version supports one active listener mailbox.
- Secrets and tokens must not be returned in plaintext.
- Material mapping import must preview and validate before confirmation.
- Duplicate or conflicting mappings must not silently overwrite existing mappings.

## Backend Service Catalog

The first implementation should organize services into these groups:

| Service group | Main responsibility |
| --- | --- |
| `DailyCockpitQueryService` | Dashboard summaries, heatmaps, attention list read models. |
| `MailQueryService` | Inbox list, mail detail, attachment summary read models. |
| `MailboxIngestionService` | Manual/scheduled mailbox sync requests and mail storage orchestration. |
| `AttachmentProcessingService` | Parse/rerun attachment processing tasks. |
| `ReviewTaskQueryService` | Human intervention queue, source preview, timeline, parsed result review. |
| `ReviewDecisionService` | Human decisions, corrections, duplicate/revision handling, parsed result confirmation. |
| `SalesForecastQueryService` | Sales forecast table read model. |
| `SalesForecastService` | Confirmed forecast writes and manual edits. |
| `ShippingPlanQueryService` | Shipping plan table read model. |
| `ShippingPlanService` | Confirmed shipping plan writes and manual edits. |
| `LineageQueryService` | Value lineage from business data back to task, mail, file, and audit evidence. |
| `SkillStudioQueryService` | Skill list, detail, version, sandbox trace read models. |
| `SkillStudioService` | Skill draft, generation, versioning, sandbox, activation, disable flow. |
| `CustomerAnalyticsQueryService` | Customer profile, heatmap, forecast evolution, recommendations. |
| `CustomerAnalyticsService` | Async analytics refresh request. |
| `ReconciliationQueryService` | Reconciliation workspace, preview, comparison, shipping detail read models. |
| `ReconciliationService` | Upload, compare, save, archive reconciliation jobs. |
| `ReconciliationExportService` | Difference PDF/report export. |
| `SystemConfigQueryService` | Configuration read models. |
| `CustomerConfigService` | Customer basic info, recognition rules, schedules. |
| `MaterialMappingService` | Mapping import preview and confirmation. |
| `UserConfigService` | Internal user administration. |
| `MailboxConfigService` | Unified mailbox configuration and connection test. |
| `FileArtifactService` | Upload/download metadata and retention checks. |
| `ProcessingTaskService` | Task lifecycle and rerun rules. |
| `WorkerDispatchService` | Worker request creation and callback ingestion. |
| `AuditService` | Immutable audit event writes. |

## Blocking Decisions Before Endpoint Contract

- Whether review task should remain embedded in `processing_tasks` only, or whether any endpoint-level name should still expose "review task" as a read model concept.
- Exact command names for human decisions: keep granular commands or normalize into one `resolveHumanDecision` command with `decisionType`.
- Whether raw evidence download should always write audit events or only for restricted file types.
- Whether reconciliation export is synchronous for small jobs or always represented as an async task.
- Whether analytics refresh uses a `processing_tasks.taskType` value or a separate scheduled job abstraction.

## Next Document

After this service document is reviewed, define worker mock request/callback payloads in `backend-worker-mocked-2.0.md`.

Then define REST endpoint paths, request/response DTOs, error format, pagination/filtering, upload/download, and server-worker callback schemas in `backend-endpoint-2.0.md`.
