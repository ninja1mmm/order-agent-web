# System Overview

Target project location: `docs/architecture/system-overview.md`

Status: Draft v0.1.

## Project Goal

Supply Chain Agent helps customer service managers, planners, and finance users process customer order emails, attachments, firm orders, forecasts, shipping plans, and reconciliation files.

The system receives or uploads customer order documents, identifies customer and order context, extracts structured order data, detects duplicates and revisions, escalates uncertain cases to human review, supports data verification and traceability, and enables financial reconciliation with exportable discrepancy reports.

## Architecture Decision

The system is split into three modules:

- `frontend`: user interface and human workflow.
- `server`: business orchestration, mail operations, API, domain state, persistence, permissions, audit, and task scheduling.
- `worker`: LLM/VLM pipeline execution.

Important boundary:

- `server` owns mail ingestion and mail sending.
- `worker` does not read mailboxes or send emails.

## Module Responsibilities

### frontend

The frontend provides the operational workspace.

Responsibilities:

- Login and session UI.
- Mail/task workspace.
- Customer service reminders.
- Exception and human review UI.
- Data verification and traceability UI.
- Skill studio UI.
- Customer profile and analytics UI.
- Financial reconciliation UI.
- System configuration UI.

The frontend only calls `server` APIs.

### server

The server is the business source of truth and orchestration center.

Responsibilities:

- Authentication and authorization.
- User, role, customer, product, sender, and mailbox configuration.
- Outlook / mailbox integration.
- Inbound email reading.
- Outbound reminder email execution.
- Customer identification from sender, company code, subject, body, attachment, and configured rules.
- Duplicate and revision detection.
- Ingestion job and parse task creation.
- Worker task dispatch.
- Worker result ingestion.
- Business validation.
- Human review task creation.
- Final business state updates.
- Audit trail and traceability.
- File storage coordination.
- Export generation coordination.
- Reconciliation state management.

The server owns all final business decisions.

### worker

The worker executes AI and document processing pipelines.

Responsibilities:

- Document classification.
- Excel / PDF / image parsing.
- LLM / VLM extraction.
- Prompt and workflow execution.
- Confidence scoring.
- Source reference extraction.
- Trace step generation.
- Structured extraction result generation.
- Error and warning reporting.

The worker must not:

- Read mailboxes directly.
- Send customer emails.
- Confirm final business records.
- Mutate final order, reconciliation, or review state directly.

## High-Level Architecture

```text
frontend
  -> server API
      -> mailbox adapters
      -> business services
      -> database
      -> object storage
      -> task queue / task table
      -> worker
          -> parser / LLM / VLM pipeline
          -> extraction result callback
```

## Main Data Flow

### 1. Mail Ingestion

1. Server triggers mailbox sync by schedule or manual user action.
2. Server reads messages from Outlook / Graph API / SMTP / IMAP adapter, depending on enabled configuration.
3. Server stores mail metadata and source attachments.
4. Server identifies customer using configured matching rules.
5. Server detects whether the message is new, duplicate, revision, or ambiguous.
6. Server creates ingestion and parse tasks for valid candidates.
7. Server escalates ambiguous cases to human review.

### 2. Document Extraction

1. Server sends parsing task to worker.
2. Worker classifies document type.
3. Worker extracts structured data using parser rules, LLM, or VLM.
4. Worker returns extracted fields, confidence, source references, trace steps, and warnings.
5. Server validates worker output against business rules.
6. Server creates normalized order data or review tasks.

### 3. Human Review

Human review is required when:

- Customer identity is ambiguous.
- Same customer sends duplicate orders for the same period.
- Attachment is unchanged but email body mentions quantity/date revisions.
- Required fields are missing.
- Forecast-to-firm signal is uncertain.
- Template or file type is invalid.
- Extraction confidence is below threshold.
- Business rule validation fails.
- Reconciliation lines do not match.

### 4. Data Verification

Users review extracted and normalized data before final confirmation.

The system must support:

- Original value.
- Extracted value.
- Corrected value.
- Source attachment.
- Source screenshot or snapshot.
- Sheet / cell / page / region reference.
- Processing trace.
- Human decision record.

### 5. Financial Reconciliation

Finance users upload firm order, ePortal export, ERP export, or customer statement files.

The system must:

- Validate file type and template before processing.
- Reject unsupported templates with clear error messages.
- Parse both sides through predefined workflows.
- Compare customer-side and internal-side data by material, period, and quantity.
- Generate a difference table.
- Highlight different rows and cells.
- Support editable discrepancy remarks.
- Preserve source screenshots and cell highlights.
- Export discrepancy report as PDF with remarks and source evidence.

### 6. Reminder And Customer Follow-Up

The system must support customer email follow-up.

Server responsibilities:

- Maintain customer email schedule.
- Record last received email time per customer and period.
- Detect overdue customer submissions.
- Create reminder tasks in the workspace.
- Generate reminder email content.
- Send reminder email only after human confirmation or configured automation approval.
- Record outbound email content, recipient, timestamp, operator, and related customer/period.

## Customer Identification

Customer identity should be configurable.

Matching conditions may include:

- Customer company code.
- Sender email address.
- Sender domain.
- Subject keywords.
- Email body keywords.
- Attachment file name.
- Attachment template type.
- Material code mapping.
- Historical customer/order pattern.

Customer identification should produce:

- Matched customer.
- Match reason.
- Confidence.
- Alternative candidates.
- Required human action if ambiguous.

## Duplicate And Revision Detection

The system must detect repeated submissions from the same customer for the same period.

Detection signals may include:

- Same customer.
- Same planning period.
- Same attachment checksum.
- Same attachment file name.
- Same order number.
- Same material set.
- Same forecast / firm markers.
- Email body mentions changes or revised quantity.

If attachment is unchanged but the email body states a change, the system should create a human review task.

The review task should show:

- Previous submission.
- Current email.
- Attachment comparison.
- Body-level change hints.
- Suggested interpretation.
- Required user decision.

## Forecast To Firm Recognition

Forecast-to-firm conversion may depend on multiple signals.

Possible signals:

- Explicit field markers.
- Attachment type.
- Template layout.
- Customer-specific rules.
- Text semantics in email body.
- Order cycle or planning period.
- Historical customer behavior.

This logic should be rule-driven and auditable.

When the system cannot confidently determine whether data is forecast or firm order, it must escalate to human review.

## Storage Boundary

### Database

Database stores:

- Users and roles.
- Customer configuration.
- Sender mapping.
- Product and material mapping.
- Mail metadata.
- Ingestion jobs.
- Parse tasks.
- Extraction result metadata.
- Normalized orders.
- Review tasks.
- Forecast snapshots.
- Firm orders.
- Shipping plans.
- Reconciliation jobs and lines.
- Reminder tasks.
- Audit events.
- Export metadata.

### Object Storage

Object storage stores:

- Raw email content where required.
- Raw attachments.
- Source file snapshots.
- Parsed intermediate artifacts.
- Screenshot evidence.
- Cell/page/region highlight artifacts.
- Trace artifacts.
- Generated exports.
- Reconciliation PDF reports.

### Retention

Default retention for raw emails, attachments, and source evidence is 3 months.

Retention policy must be configurable if customer compliance requirements change.

## External Systems

Potential external systems:

- Outlook mailbox.
- Microsoft Graph API.
- SMTP / IMAP mailbox access.
- LLM provider.
- VLM provider.
- ERP export files.
- Customer ePortal export files.
- Object storage.
- Email sending service.

Graph API usage is not yet confirmed, so mailbox integration must be designed behind adapters.

Recommended mailbox adapters:

- `GraphMailAdapter`
- `SmtpMailAdapter`
- `ImapMailAdapter`
- `ManualUploadAdapter`

## Core User Roles

### Customer Service Manager

Uses the system to monitor customer emails, handle reminders, review extracted order data, resolve exceptions, and confirm standardized order results.

### Planner

Uses the system to validate forecast, firm order, material quantity, planning period, and volatility-related anomalies.

### Finance User

Uses the system to compare customer settlement data against internal shipping or ERP data, add discrepancy notes, and export reconciliation reports.

### Admin

Manages users, permissions, customers, sender mappings, products, mailbox configuration, templates, and business rules.

## Business State Ownership

Server owns:

- Mail sync state.
- Reminder state.
- Ingestion job state.
- Parse task state.
- Review task state.
- Normalized order state.
- Forecast state.
- Firm order state.
- Shipping plan state.
- Reconciliation state.
- Export state.
- Audit state.

Worker owns only transient pipeline execution state.

## Traceability Principle

Every normalized business value should be traceable to:

- Source mailbox or manual upload.
- Source email.
- Source attachment.
- File checksum or version.
- Sheet / cell / page / region, where applicable.
- Parser workflow.
- LLM/VLM model.
- Prompt or skill version.
- Extraction timestamp.
- Worker trace step.
- Server validation result.
- Human decision, if any.

## Audit Principle

The system must record:

- AI extraction result.
- Business validation result.
- Human review decision.
- Manual correction.
- Reminder generation.
- Outbound reminder email.
- Export generation.
- Reconciliation remark.

Human decisions should record:

- User.
- Timestamp.
- Original value.
- AI-extracted value.
- Corrected value.
- Reason.
- Related source reference.
- Related task ID.

## Non-Goals

The system does not replace ERP, financial settlement systems, customer ePortals, or official mailbox infrastructure.

The system does not allow worker or AI pipeline output to directly confirm final business records without server-side validation.

The system does not hide uncertainty. Ambiguous, low-confidence, duplicate, revised, or invalid-template cases must be visible to users.

## Open Questions

- Whether Microsoft Graph API can be used in the customer environment.
- Whether SMTP/IMAP access is allowed as fallback.
- Whether outbound reminder emails require manual approval before sending.
- Final standard order field list.
- Final firm order upload template.
- Final reconciliation source-of-truth rule.
- Whether raw email body storage is allowed under customer compliance policy.
- Whether 3-month retention is sufficient for audit requirements.
