# Supply Chain Agent Requirement

Target project location: `docs/requirements/supply-chain-agent.md`

Status: Draft v0.1.

## Purpose

Supply Chain Agent helps an automotive parts company process order-related documents from OEM customers.

OEMs may send different Excel or PDF formats through a dedicated mailbox. The system must identify the customer and order context, extract order information, normalize heterogeneous inputs into the automotive parts company's standard data structures, support human review, store confirmed results, and provide export, traceability, customer analytics, skill configuration, and financial reconciliation.

## Business Context

The system is used in an automotive parts supply chain scenario.

Important terminology:

- The system owner is the automotive parts company.
- The upstream senders are OEM customers or customer-side contacts.
- OEM-provided materials may have different formats.
- The automotive parts company needs standardized internal outputs.

The system standardizes two major data outputs:

- `sales forecast`: weekly forecast view.
- `shipping plan`: daily firm shipping/order view.

## Users And Roles

### Customer Service Manager

Responsible for:

- Monitoring incoming customer emails.
- Reviewing customer recognition results.
- Handling reminders and overdue customer submissions.
- Reviewing AI-extracted orders.
- Resolving duplicate, revised, uncertain, or failed parsing cases.
- Maintaining customer matching configuration.
- Confirming standardized order results.

### Planner

Responsible for:

- Reviewing forecast and firm order results.
- Checking quantity volatility.
- Reviewing forecast-to-firm interpretation.
- Reviewing customer profile and analytics recommendations.

### Finance User

Responsible for:

- Uploading ePortal settlement/export files.
- Comparing ePortal data with shipping plan data.
- Reviewing discrepancy tables.
- Adding discrepancy remarks.
- Exporting reconciliation reports.

### Admin

Potentially responsible for:

- User management.
- Page-level permission configuration.
- System configuration access.

Admin-specific scope is not fully confirmed. For the first version, all users may see most business data, while configuration pages may later be hidden from normal users.

## Scope

All POC-aligned business modules are in scope.

There is no MVP split by module at this requirement stage.

In-scope modules:

- Mail ingestion and customer recognition.
- Customer follow-up reminder.
- Order extraction and normalization.
- Duplicate and revision handling.
- Forecast-to-firm recognition.
- Human review and exception handling.
- Data verification and traceability.
- Data export.
- Skill studio.
- Customer profile and analytics.
- Financial reconciliation.
- System configuration.

## End-To-End Flow

1. A dedicated mailbox receives customer emails and attachments.
2. The server scans the mailbox on a schedule and may also support manual sync.
3. The server identifies customer context using configured rules.
4. The server stores mail metadata, email body, and attachments.
5. The server detects duplicate, revised, ambiguous, or invalid submissions.
6. The server creates parsing tasks for valid candidate documents.
7. The worker executes document classification and LLM/VLM extraction.
8. The worker returns structured extraction results, confidence, source references, warnings, and trace steps.
9. The server validates extraction results against business rules.
10. The server creates review tasks for uncertain or conflicting results.
11. Customer service managers or planners resolve review tasks.
12. Confirmed data is stored in standard `sales forecast` or `shipping plan` structures.
13. Users can review, trace, modify, and export confirmed results.
14. Finance users upload ePortal files and compare them with shipping plan data.
15. Users can export reconciliation discrepancy reports with remarks and source evidence.

## Mail Ingestion

### Requirements

- The system uses a dedicated mailbox.
- The server owns mailbox scanning and mail operations.
- Mailbox scanning should support scheduled execution.
- Recommended initial scan interval is once per hour because expected daily volume is fewer than 10 emails.
- Manual mailbox sync may be supported for operational convenience.
- Email body must participate in extraction and revision detection.
- Email body storage is allowed.
- Raw email body, attachments, and source evidence should be retained for 3 months, then hidden.

### Supported Input Channels

Potential mailbox integrations:

- Microsoft Graph API.
- SMTP / IMAP.
- Manual upload.

Microsoft Graph API availability is not confirmed, so mailbox access should be designed behind adapters.

## Customer Recognition

### Requirements

The system must identify which OEM/customer context an incoming email belongs to.

Customer recognition should be configurable by customer service managers.

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

Recognition output should include:

- Matched customer.
- Match reason.
- Confidence.
- Alternative candidates.
- Whether human confirmation is required.

### Human Review Triggers

Customer recognition should escalate to human review when:

- No customer can be matched.
- Multiple customers are possible.
- Sender is unknown.
- Company code conflicts with sender/domain rules.
- Material code mapping conflicts with customer mapping.

## Customer Follow-Up Reminder

### Requirements

The system must support customer follow-up reminders.

The system should not automatically send reminder emails to customers without human confirmation.

The system should:

- Maintain customer submission schedule.
- Track last received email time per customer and period.
- Detect overdue customer submissions.
- Create reminder items in the customer service workspace.
- Generate suggested reminder email content.
- Allow the customer service manager to review and confirm before sending.
- Record reminder generation and sending history if a reminder is sent.

## Input Document Types

Supported first-stage attachment types:

- Excel files with various OEM-specific layouts.
- PDF files.

Unsupported or invalid file types should be rejected with clear failure reasons.

The system should detect invalid templates before deep processing when possible.

## Standard Output Data

The system should normalize customer-provided materials into standard internal data structures.

There are two standard output groups:

- `sales forecast`
- `shipping plan`

### Sales Forecast

`sales forecast` is a weekly forecast structure.

OEM customers may send daily order Excel files or other non-standard formats. The system should parse the input and aggregate daily quantities into weekly forecast columns when required.

Example raw forecast table format:

| Customer | Customer Code | Customer P/N | Customer#+Ref# | Faurecia P/N | SA | Type | Production line | OEM | Program | 2025-W48 | 2025-W49 | 2025-W50 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |  | 11/24 | 12/1 | 12/8 |
| Changchun | 1032000000 | 2777977X | 1032000000-2777977XN | 2777977XN | 30478671 | E-pump 2.0 | E-pump line 2 | VW | Audi_Q5L |  |  |  |

Minimum forecast dimensions:

- Customer.
- Customer Code.
- Customer P/N.
- Customer reference.
- Internal part number.
- SA.
- Product type.
- Production line.
- OEM.
- Program.
- Week.
- Week start date.
- Quantity.

The raw Excel may use multi-row headers. The final storage schema does not need to copy the raw Excel matrix exactly, but exports must support the required customer/company template.

### Shipping Plan

`shipping plan` is a daily firm order or shipping structure.

Example fields:

| Field | Description |
| --- | --- |
| Source.Name | Source file name |
| Customer code | Customer code |
| Customer | Customer name |
| Part Number | Material or part number |
| Actual Qty | Actual shipping quantity |
| Shipping Date | Shipping date |
| Delivery Note | Delivery note |
| Remark | Remark |
| Customer service owner | Customer service owner |
| Plant | Plant |
| HU | Handling unit quantity |
| Pallet count | Pallet count |
| Product | Product |

Example row:

| Source.Name | Customer code | Customer | Part Number | Actual Qty | Shipping Date | Delivery Note | Remark | Customer service owner | Plant | HU | Pallet count | Product |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Pan Dandan-May.xlsx | 1343000000 | WLB1343 | 1191923XB | 2304 | 2026/1/4 | 45810432 | 261301077 | Pandandan | Plant 2 | 256 | 9 | E-pump 1.0 |

## Order Period Rules

### Sales Forecast

- Sales forecast is organized by week.
- OEMs may provide daily order quantities.
- Daily quantities should be parsed and aggregated into weekly forecast view.
- Week labels may use formats such as `2025-W48`.
- Week start dates may appear in header rows.

### Shipping Plan

- Shipping plan is organized by day.
- Shipping plan represents firm order or actual shipping data.
- Shipping date is a key field.

## Forecast To Firm Recognition

The system must distinguish forecast data from firm order or shipping plan data.

Recognition may depend on:

- Explicit markers in the file.
- Field names.
- Attachment type.
- Template structure.
- Email body semantics.
- Customer-specific rules.
- Historical behavior.
- Planning period.
- Business skill rules.

If the system cannot confidently distinguish forecast from firm order, it must create a human review task.

## Duplicate And Revision Handling

The system must detect repeated submissions from the same customer for the same period.

Duplicate or revision signals may include:

- Same customer.
- Same planning period.
- Same attachment checksum.
- Same attachment file name.
- Same order number.
- Same material set.
- Same forecast or firm markers.
- Email body mentions modified quantity, revised date, or updated order.
- Attachment unchanged but email body contains new instructions.

If attachment content is unchanged but the email body states changes such as `W14 quantity changed to ...`, the system should escalate to human review.

The review task should show:

- Previous submission.
- Current email.
- Previous attachment.
- Current attachment.
- Body-level change hints.
- Suggested interpretation.
- Required user decision.

## Human Review

Human review is required when:

- Extraction confidence is low.
- Customer identity is ambiguous.
- Duplicate order is detected.
- Email body modifies an unchanged attachment.
- Quantity is abnormal.
- Forecast/firm type cannot be distinguished.
- Required fields are missing.
- File type is unsupported.
- Template is invalid.
- Business rule validation fails.
- Reconciliation lines do not match.

Review actions may include:

- Confirm AI result.
- Correct extracted value.
- Mark as duplicate.
- Mark as revised order.
- Reject invalid file.
- Assign correct customer.
- Assign correct document type.
- Confirm forecast or firm interpretation.
- Add review note.

Confirmed data should be stored and remain editable after entering the database.

## Data Verification And Traceability

### Requirements

Users must be able to verify processed data before or after confirmation.

The system should show:

- Source email.
- Source attachment.
- Extracted value.
- Corrected value.
- Final value.
- Source screenshot or snapshot.
- Cell highlight for Excel sources.
- Page or region highlight for PDF sources.
- Processing trace.
- Human decision record.

### Export

Data verification results should support Excel export.

The export should follow the automotive parts company's required standard template or customer-facing output template.

## Skill Studio

### Requirements

Users should be able to define agent skills using natural language.

Skill workflow:

1. User describes a skill in natural language.
2. System converts the description into a structured skill.
3. User tests the skill in shadow mode.
4. Shadow mode shows expected impact without changing real results.
5. User can activate the skill.
6. Active skills can be called by the agent during processing.
7. Agent usage of active skills still requires human confirmation when the result affects business data.

Example skill scope:

- Adjusting firm order data based on business experience.
- Applying customer-specific quantity adjustment rules.
- Detecting unusual forecast-to-firm patterns.
- Supporting planning-related judgment.

Skill active mode does not bypass human review requirements.

### Approval

No separate approval workflow is required for skill activation at this stage.

## Customer Profile And Analytics

### Requirements

Customer profile should provide analytics and recommendations.

The system should show:

- Confirmed firm orders.
- High-volatility materials.
- Large forecast deviation materials.
- Historical forecast vs actual shipping patterns.
- Forecast evolution from earlier cycles to final firm or actual shipping.
- AI-generated planning suggestions.

Customer profile recommendations should be display-only.

Recommendations must not automatically modify orders, forecasts, shipping plans, or skills.

### Abnormality Signals

Potential abnormality signals:

- High quantity volatility.
- Large deviation from historical forecast.
- Large deviation between forecast and actual shipping.
- Repeated customer over-forecast or under-forecast pattern.

Exact thresholds are not yet confirmed.

## Financial Reconciliation

### Purpose

Finance users compare ePortal exported settlement data with system shipping plan data.

ePortal files are manually exported outside this system and uploaded into this system.

The system does not directly integrate with ERP or ePortal.

### Requirements

The system must:

- Support manual upload of ePortal export files.
- Support comparison with shipping plan data.
- Validate uploaded file type and template.
- Show clear errors for invalid file type or unsupported template.
- Parse both sides with predefined workflows.
- Match records primarily by customer, material number, date, and order information.
- Generate a difference table.
- Highlight different rows and cells.
- Support editable discrepancy remarks.
- Preserve original source screenshot.
- Preserve cell highlight evidence.
- Export discrepancy report as PDF.

### Matching Keys

Potential reconciliation keys:

- Customer.
- Material number.
- Date.
- Order number.
- Delivery note.
- Order + material combination.

The exact unique matching rule requires further confirmation.

## System Configuration

Configuration should support:

- Customer master data.
- Customer company code.
- Customer sender mapping.
- Sender domain mapping.
- Customer-specific keywords.
- Material mapping.
- Mailbox settings.
- Customer submission schedule.
- Template rules.
- Skill configuration.
- User and page-level permission configuration.

Customer service managers should be able to maintain customer recognition configuration.

Admin-only configuration scope is not fully confirmed.

## Permissions

Initial assumption:

- Business data is visible to all internal users.
- Page-level permission hiding may be added later.
- Configuration pages may be admin-only.
- Customer dimension filtering is required for usability, but strict data isolation by customer is not required.

Potential roles:

- Customer Service Manager.
- Planner.
- Finance User.
- Admin.

## Audit And Retention

### Audit

The system should record:

- Mail ingestion.
- Customer recognition result.
- Duplicate and revision detection.
- AI extraction result.
- Business validation result.
- Human review decision.
- Manual correction.
- Skill creation.
- Skill shadow test.
- Skill activation.
- Reminder generation.
- Reminder sending after human confirmation.
- Data export.
- Financial reconciliation remark.

### Retention

Raw email body, attachments, and source evidence should be retained for 3 months.

After 3 months, source evidence should be hidden.

Exact archival or deletion policy is not confirmed.

## Failure And Edge Cases

The system must handle:

- Unsupported file type.
- Invalid template.
- Missing required fields.
- Customer recognition failure.
- Ambiguous customer recognition.
- Low extraction confidence.
- Duplicate customer submission.
- Revised quantity mentioned only in email body.
- Forecast/firm distinction failure.
- Quantity abnormality.
- Date or week parsing failure.
- ePortal upload template mismatch.
- Reconciliation unmatched line.
- LLM/VLM provider timeout.
- LLM/VLM extraction failure.
- Worker parsing failure.
- Mailbox sync failure.

Failure reason should be visible to users.

## Non-Goals

The system does not directly integrate with ERP in the current scope.

The system does not directly integrate with ePortal in the current scope.

The system does not automatically send reminder emails without human confirmation.

The system does not allow AI or worker results to directly confirm final business records without server validation and required human review.

The system does not implement full multilingual UI in the first phase.

The system does not automatically apply customer profile recommendations back into order processing.

The system does not require formal approval workflow for skill activation at this stage.

The system does not require customer-level data isolation at this stage.

The system does not require audit log export at this stage.

The system does not require Teams, enterprise WeChat, or external notification integration at this stage.

## Working Assumptions

- Mailbox scanning once per hour is sufficient for the first stage.
- Expected daily mail volume is fewer than 10 emails.
- Supported attachment types are Excel and PDF.
- Email body participates in extraction and revision detection.
- Confirmed order data can still be modified after database storage.
- Standard output is organized around `sales forecast` and `shipping plan`.
- Sales forecast is weekly.
- Shipping plan is daily and firm.
- Data verification export format is Excel.
- Financial reconciliation report export format is PDF.
- The first UI language is Simplified Chinese.
- The frontend should preserve a multilingual-ready structure, but Traditional Chinese and English are not first-phase delivery requirements.
- Candidate LLM/VLM providers include GPT-4o and Qwen.

## Open Questions

- Whether Microsoft Graph API can be used in the customer environment.
- Whether SMTP/IMAP access is allowed as fallback.
- Final standard sales forecast export template.
- Final standard shipping plan export template.
- Final ePortal reconciliation upload template.
- Exact reconciliation unique matching key.
- Exact abnormal quantity threshold.
- Exact high-volatility threshold.
- Exact large forecast deviation threshold.
- Exact customer submission schedule rules.
- Whether source evidence should be archived or physically deleted after being hidden for 3 months.
- Final LLM/VLM provider and deployment constraints.
- Whether admin-only configuration pages are required in the first release.
