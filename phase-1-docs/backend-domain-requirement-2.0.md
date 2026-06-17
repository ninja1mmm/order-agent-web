# Backend Domain Requirement 2.0

Target project location: `server/docs/backend-domain-requirement-2.0.md`

Status: Draft v0.2.

## Purpose

This document defines the simplified MongoDB-oriented domain model for Supply Chain Agent.

The goal of version 2.0 is to keep the backend model readable and implementation-friendly while preserving the full business traceability chain from final business data back to the original customer email, attachment, AI extraction result, human decision, and stored file.

## Design Principles

- Prefer fewer MongoDB collections with richer embedded records.
- Use collections only when a concept has an independent lifecycle, independent query boundary, or audit/retention requirement.
- Keep customer configuration embedded under `customers` unless scale or edit-history requirements later force separation.
- Keep raw customer evidence separate from confirmed business truth.
- Treat AI extraction as evidence, not final business truth.
- Treat human review decisions as auditable business context.
- Treat `audit_events` as immutable compliance history.
- Use query services/read models for dashboards, heatmaps, attention lists, analytics, and comparison views.

## Collection Overview

The first implementation should use these 11 core collections:

| Group | Collection | Purpose |
| --- | --- | --- |
| Configuration and Identity | `users` | Internal employee account and actor identity. |
| Configuration and Identity | `customers` | Customer master data, matching rules, material mapping, and reminder schedule. |
| Configuration and Identity | `mailbox_configs` | Single unified mailbox configuration. |
| Ingestion | `mail_messages` | Raw inbound customer email and attachment metadata. |
| Processing Engine | `processing_tasks` | Task lifecycle, AI result, human review context, and worker trace. |
| Business Truth | `sales_forecasts` | Final confirmed weekly forecast data. |
| Business Truth | `shipping_plans` | Final confirmed daily firm/shipping data. |
| Advanced Workflow | `skill_definitions` | Skill metadata, versions, and sandbox tests. |
| Advanced Workflow | `reconciliation_jobs` | Finance reconciliation snapshot and comparison rows. |
| Technical Support | `file_artifacts` | Object-storage file metadata. |
| Technical Support | `audit_events` | Immutable user/system audit history. |

## Collection Definitions

### 1. `users`

Represents an internal employee account.

Fields:

```text
_id
email
passwordHash
displayName
role
status
createdAt
updatedAt
```

Rules:

- `role` can start as a string enum: `admin`, `planner`, `customerService`, `finance`.
- Split roles into a separate collection only when permission complexity grows.

### 2. `customers`

Represents customer master data and customer-specific configuration.

Fields:

```text
_id
customerCode
name
status
contacts[]
materialMappings[]
submissionSchedules[]
createdAt
updatedAt
```

Embedded `contacts[]`:

```text
email
domain
keywords[]
```

Embedded `materialMappings[]`:

```text
customerPartNumber
internalPartNumber
productLine
productType?
program?
status?
```

Embedded `submissionSchedules[]`:

```text
documentType
expectedDay
graceHours
enabled?
```

Rules:

- Sender recognition uses `contacts[].email`, `contacts[].domain`, and `contacts[].keywords`.
- Material normalization uses `materialMappings[]`.
- Reminder read models are computed from `submissionSchedules[]` and received mail history.

### 3. `mailbox_configs`

Represents the single unified mailbox configuration.

Fields:

```text
_id
provider
address
syncIntervalMinutes
enabled
lastSyncedAt
createdAt
updatedAt
```

Rules:

- The first version supports one active inbound mailbox.
- Provider secrets or tokens must not be stored in plaintext in this collection.

### 4. `mail_messages`

Represents an immutable raw inbound customer email.

Fields:

```text
_id
customerId
messageId
fromEmail
subject
bodyText
receivedAt
retentionHiddenAt
recognitionEvidence
attachments[]
createdAt
```

Embedded `recognitionEvidence`:

```text
status
matchedCustomerId
candidateCustomerIds[]
matchReasons[]
confidence
```

Embedded `attachments[]`:

```text
attachmentId
fileName
fileArtifactId
checksum
```

Rules:

- `fromEmail` is source evidence.
- `customerId` is the resolved operational customer used for frontend filtering and service queries.
- `customerId` should be set from `recognitionEvidence.matchedCustomerId` after automatic recognition or human decision.
- If recognition is ambiguous, `customerId` can remain null until resolved.
- `attachments[].checksum` is used for duplicate attachment detection.
- Mail-level status is not persisted. It is derived from related `processing_tasks`.

Recommended indexes:

```text
messageId unique
customerId + receivedAt
fromEmail + receivedAt
attachments.checksum
```

### 5. `processing_tasks`

Represents the processing lifecycle for mail body analysis, attachment extraction, revision detection, skill generation, sandbox tests, and reconciliation parsing.

Fields:

```text
_id
customerId
mailMessageId
attachmentId
taskType
status
parentTaskId
attemptNo
isLatest
workerTaskId
correlationId
reviewReason
aiResult
humanDecisions[]
resultRevision
reviewCommits[]
publishedResultRevision
traceSteps[]
createdAt
updatedAt
```

Allowed `status`:

```text
queued
processing
waiting_human_decision
completed
failed
cancelled
```

Common `taskType` values:

```text
email_body_analysis
customer_recognition
classify_document
extract_forecast
extract_shipping
analyze_revision
extract_reconciliation
generate_skill_version
execute_skill_sandbox
mailbox_sync
```

Embedded `aiResult`:

```text
resultType
confidenceScore
rawExtractedData
normalizedRows[]
warnings[]
sourceReferences[]
```

Recommended `normalizedRows[]` for sales forecast:

```text
rowId
customerPartNumber
internalPartNumber
sourceDate
weekKey
weekStartDate
quantity
sourceRefs[]
```

Rules for forecast rows:

- If AI extracts daily values, server aggregates by customer, material, and ISO week before writing `sales_forecasts`.
- If AI extracts weekly values, server maps directly to `sales_forecasts.lines[].weekQuantities[]`.
- `sourceDate` is used when the source is daily.
- `weekKey` and `weekStartDate` are used when the source is weekly or after aggregation.

Recommended `normalizedRows[]` for shipping plan:

```text
rowId
shippingDate
materialNumber
orderNumber
orderLine
actualQty
deliveryNote
sourceRefs[]
```

Embedded `sourceReferences[]`:

```text
fieldPath
sourceType
attachmentId
sheetName
cellRange
pageNumber
region
textSnippet
```

Embedded `humanDecisions[]`:

```text
userId
fieldPath
originalValue
aiValue
correctedValue
reason
decidedAt
```

Embedded `reviewCommits[]`:

```text
commitId
baseResultRevision
resultRevision
authorUserId
message
changes[]
createdAt
```

Embedded `reviewCommits[].changes[]`:

```text
rowId
fieldPath
oldValue
newValue
reason
sourceReferenceIds[]
```

Embedded `traceSteps[]`:

```text
stepName
stepType
status
inputSummary
outputSummary
startedAt
completedAt
```

Rules:

- `attachmentId` is nullable for mail-level tasks.
- `isLatest` applies to processing attempts for the same source and task type.
- Rerun creates a new task with `parentTaskId`, incremented `attemptNo`, and `isLatest = true`; older attempts should be set to `isLatest = false`.
- `waiting_human_decision` requires `reviewReason` and at least one actionable review path for the frontend.
- Human corrections are stored in `humanDecisions[]` for business context and also in `audit_events` for immutable audit.
- `resultRevision` is the optimistic-concurrency token for editable parsed results and starts at `1` when the worker result is accepted.
- Parse Review cell edits must be submitted as an atomic review commit with the client's `baseResultRevision`.
- A review commit is accepted only when `baseResultRevision` equals the current `resultRevision`; otherwise return `resultRevisionConflict` and do not apply any change.
- Accepted review commits are immutable and increment `resultRevision` by one.
- The original worker result must remain traceable. Review commits represent human patches over that result and must not silently replace the original evidence.
- `publishedResultRevision` records which reviewed result revision was written to `sales_forecasts` or `shipping_plans`.

Recommended indexes:

```text
customerId + status + createdAt
mailMessageId + attachmentId + taskType + isLatest
correlationId unique
parentTaskId
```

### 6. `sales_forecasts`

Represents final confirmed weekly forecast data.

Fields:

```text
_id
customerId
lines[]
createdAt
updatedAt
```

Embedded `lines[]`:

```text
lineId
materialId
customerPartNumber
internalPartNumber
weekQuantities[]
```

Embedded `weekQuantities[]`:

```text
quantityId
weekKey
weekStartDate
quantity
previousQuantity
deltaQuantity
currentVersion
sourceTaskId
isManuallyEdited
versions[]
```

Embedded `versions[]`:

```text
version
quantity
sourceTaskId
changedBy
changedAt
changeType
previousQuantity
deltaQuantity
isManuallyEdited
reason
```

Rules:

- The visible frontend table should read the current fields on each `weekQuantities[]` cell.
- `versions[]` provides the trace chain for the cell history.
- Do not add `isLatest` to each version if the current value is stored directly on the cell.
- If the implementation chooses an append-only flat list of quantities instead of `versions[]`, then an `isLatest` field is required and the service must enforce only one latest row per customer/material/week.

### 7. `shipping_plans`

Represents final confirmed daily firm order/shipping data.

Fields:

```text
_id
customerId
lines[]
createdAt
updatedAt
```

Embedded `lines[]`:

```text
lineId
shippingDate
materialNumber
orderNumber
orderLine
deliveryNote
actualQty
previousQuantity
deltaQuantity
currentVersion
sourceTaskId
isManuallyEdited
versions[]
```

Embedded `versions[]`:

```text
version
actualQty
sourceTaskId
changedBy
changedAt
changeType
previousQuantity
deltaQuantity
isManuallyEdited
reason
```

Rules:

- `lineId` is required because reconciliation rows may reference specific embedded shipping lines.
- The visible frontend table should read the current fields on each `lines[]` record.
- `versions[]` provides line-level history and traceability.
- Do not add `isLatest` to each version if the current value is stored directly on the line.

### 8. `reconciliation_jobs`

Represents a finance reconciliation snapshot.

Fields:

```text
_id
customerId
periodKey
status
targetFileArtifactId
comparisonLines[]
createdAt
updatedAt
```

Embedded `comparisonLines[]`:

```text
lineId
materialNumber
orderNumber
orderLine
targetQty
shippingQty
differenceQty
matchLevel
shippingPlanLineRefs[]
status
sourceRowNos[]
```

Rules:

- `comparisonLines[]` must include matched rows and difference rows.
- `shippingPlanLineRefs[]` should reference `shipping_plans.lines[].lineId`.
- The job stores a reproducible comparison snapshot, not another source of shipping truth.

### 9. `skill_definitions`

Represents a business rule or prompt skill.

Fields:

```text
_id
name
status
applicableCustomerIds[]
activeVersionNumber
versions[]
testRuns[]
createdAt
updatedAt
```

Embedded `versions[]`:

```text
versionNumber
promptText
scope
generatedDocument
executableScript
createdAt
createdBy
```

Embedded `testRuns[]`:

```text
versionNumber
taskId
isConfirmed
createdAt
createdBy
```

Rules:

- Historical versions are immutable after creation.
- Activating a version updates `activeVersionNumber`.
- Processing tasks should store the skill version they used in task trace or source references when skill execution affects the result.

### 10. `file_artifacts`

Represents object-storage metadata for physical files.

Fields:

```text
_id
artifactType
storageKey
fileName
contentType
sizeBytes
checksum
retentionHiddenAt
createdAt
```

Rules:

- `checksum` supports duplicate detection.
- `retentionHiddenAt` supports the three-month raw-evidence visibility rule.

### 11. `audit_events`

Represents immutable user/system audit history.

Fields:

```text
_id
userId
action
entityType
entityId
commitId?
beforeData
afterData
createdAt
```

Rules:

- Manual corrections must be written both to `processing_tasks.humanDecisions[]` and `audit_events`.
- Audit events are append-only.
- A Parse Review commit creates one audit event linked by `commitId`; `beforeData` and `afterData` must contain the affected cell paths and values.

## Traceability Chain

The trace path for a forecast quantity or shipping line is:

```text
SalesForecast.weekQuantities[].sourceTaskId
  or ShippingPlan.lines[].sourceTaskId
    -> processing_tasks._id
      -> processing_tasks.aiResult.normalizedRows[]
      -> processing_tasks.humanDecisions[]
      -> processing_tasks.mailMessageId + attachmentId
        -> mail_messages._id
        -> mail_messages.attachments[].fileArtifactId
          -> file_artifacts._id
```

For a forecast quantity cell:

1. Frontend sends `quantityId`.
2. Server finds the owning `sales_forecasts` document and the matching `weekQuantities[]` cell.
3. Server reads the current `sourceTaskId`.
4. Server loads `processing_tasks`.
5. Server loads the source `mail_messages`.
6. Server resolves the matching attachment by `attachmentId`.
7. Server loads `file_artifacts`.
8. Server returns the original email, attachment file, AI rows, source references, human decisions, and cell `versions[]`.

For a shipping line:

1. Frontend sends `lineId`.
2. Server finds the owning `shipping_plans` document and matching `lines[]` record.
3. Server follows `sourceTaskId` to `processing_tasks`.
4. Server follows `mailMessageId + attachmentId` to raw email and file evidence.
5. Server returns line `versions[]`, AI extraction, human decisions, and original source evidence.

## Latest Value Strategy

Recommended strategy:

- Do not put `isLatest` on every `weekQuantities[]` or `shipping_plans.lines[]` version item.
- Store the current visible value directly on the cell or line.
- Store historical values inside `versions[]`.
- Use `currentVersion` to identify the currently visible version number.

Why:

- It avoids enforcing "only one latest version" inside large embedded arrays.
- It makes the normal frontend table query simple.
- It keeps the full history available for the lineage drawer.

Alternative strategy:

- If every historical value is stored as a separate sibling row in `weekQuantities[]` or `lines[]`, then each row needs `isLatest`.
- That approach requires stricter write logic and indexes to prevent multiple latest values for the same customer/material/week or same shipping business key.
- Use this only if version history becomes too large to embed under one cell/line.

## Business Coverage Checklist

- Customer mail can be filtered by `mail_messages.customerId`.
- Ambiguous sender recognition is represented by `recognitionEvidence.status = ambiguous` and a `processing_tasks.status = waiting_human_decision` task.
- Duplicate attachment detection uses `mail_messages.attachments[].checksum` and `file_artifacts.checksum`.
- Mail body versus attachment conflict is represented as a mail-level `processing_tasks` record with `attachmentId = null`.
- Forecast extraction supports daily source rows and weekly target storage.
- Shipping plan extraction supports daily firm order rows.
- Frontend task workbench can filter `processing_tasks` by `status`, `customerId`, `mailMessageId`, and `attachmentId`.
- Orders page can show latest values from `sales_forecasts` and `shipping_plans`.
- Lineage drawers can follow `sourceTaskId -> mailMessageId -> attachmentId -> fileArtifactId`.
- Finance reconciliation can reference embedded shipping lines through `shippingPlanLineRefs[]`.
- Skill Studio can trace active and historical versions through `activeVersionNumber` and `versions[]`.
- Human corrections are available in both business context (`processing_tasks.humanDecisions[]`) and audit history (`audit_events`).
- Parse Review edits are protected by `processing_tasks.resultRevision`; stale commits fail instead of overwriting another user's accepted changes.
