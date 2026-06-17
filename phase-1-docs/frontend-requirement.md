# Frontend Requirement

Target project location: `frontend/docs/frontend-requirement.md`

Status: Draft v0.1.

## Purpose

This document defines the frontend requirements for Supply Chain Agent.

The frontend should provide a workflow-oriented operational system for customer service managers, planners, and finance users. It should make customer emails, file intake, AI processing, human intervention, standardized tables, traceability, and export workflows visible and actionable.

## Frontend Scope

The frontend should cover:

- Intelligent customer service workspace.
- Customer inbox / mail intake.
- Exception handling / human intervention.
- Data review / standard online tables.
- Skill studio.
- Customer profile and analytics.
- Financial reconciliation.
- System configuration.

This draft currently details the first eight modules.

## Design Principles

- Use operational UI patterns rather than marketing-style pages.
- Keep information dense, scannable, and task-oriented.
- Preserve the user's ability to trace from final data back to source mail, source attachment, source cell/page/region, AI processing steps, and human decisions.
- Show Chinese labels in the first version.
- Keep the frontend structure ready for future multilingual support.
- Internal API fields can remain English and camelCase.
- Use status badges consistently.
- Use side sheets, drawers, tabs, and large dialogs for detail views.
- Do not hide uncertainty; low-confidence, failed, ambiguous, or manual-edited data should be visible.
- Do not show large page titles and subtitles inside page content. The top navigation and optional in-page subnav already provide page context.
- Use fixed-height page shells where possible. The page should not scroll as a whole; scrolling should happen inside each panel/card area.
- Main operational pages should prefer a consistent left/middle/right panel layout. The current prototype uses approximately `300px / 1fr / 420px`.
- System Configuration is the exception: it uses a left configuration menu and one large right-side panel, with internal split cards when needed.
- If a panel header has actions, use icon-only or compact controls so the divider line under each panel header stays visually aligned.
- Supply Chain and Customer sections should keep page-level subnav in the content area in the first prototype. Do not move second-level navigation into an expandable top nav until implementation needs it.

## Common Page States

All data-driven pages should define:

- Loading state.
- Empty state.
- Error state.
- Permission/hidden state if page-level permissions are added.
- Refresh or retry behavior when applicable.

## Common Status Labels

Internal enums should remain English.

User-facing labels should be Simplified Chinese in the first version.

Suggested display mapping:

| Internal status | Chinese label |
| --- | --- |
| `unprocessed` | 待处理 |
| `queued` | 排队中 |
| `processing` | 处理中 |
| `needsReview` | 待人工确认 |
| `completed` | 已完成 |
| `failed` | 处理失败 |
| `partiallyCompleted` | 部分完成 |
| `unsupported` | 不支持 |
| `manuallyEdited` | 人工修改 |
| `changed` | 有变动 |
| `new` | 新增 |
| `blocked` | 已暂停 |
| `waitingHumanDecision` | 等待人工判断 |

## Module 1: Intelligent Customer Service Workspace

### Page Goal

This page is the user's daily operation cockpit.

It should answer:

- What did AI process yesterday?
- Which customers have recently sent emails?
- Which customers may need follow-up?
- Which received mails have blocked the downstream workflow and need user action now?

This page is a task-attention view, not a full mail archive.

### Layout

Recommended layout:

- Left panel: yesterday AI processing summary.
- Middle panel: customer mail activity and today's mail count view.
- Right panel: mail attention items.

The page should use the standard three-panel layout. It should not show a large page title or subtitle.

### Left Panel: Yesterday AI Processing Summary

Display:

- Processed file count.
- Processed email count.
- Involved customer count.
- Successful parse count.
- Failed parse count.
- New mail attention item count.
- Customers that had processed mails yesterday.
- Short handover text for important blocked cases.

Expected data source:

- `YesterdayOperationSummary` read model.

### Middle Panel: Customer Mail Activity Heatmap

Display:

- Rows are customers.
- Columns are dates.
- Cell color depth represents mail count.
- Default view: recent customer mail activity, such as last 30 days.
- Secondary view: today's received mail count by customer.
- Expected-but-missing customer mail should be highlighted based on configured customer submission frequency.

Interaction:

- The view can switch between recent activity and today count.
- Clicking a cell opens a side sheet with the related mail list.
- The sheet should show customer, date, mail subject, sender, received time, mail body preview, attachment count, submission status, and review status.
- Clicking a mail in the sheet should navigate to the Customer Inbox detail for the exact mail.
- The heatmap does not need a bottom explanatory paragraph in the first UI.

Expected data source:

- `CustomerMailActivity` read model.
- `TodayCustomerMailCount` read model.

### Right Panel: Mail Attention Items

Display:

- Received mails that block the downstream workflow until a user decision is made.
- Customer.
- Title.
- Status.
- Related mail received time.
- Blocking reason.

Sorting:

- Sort by related mail received time ascending when available.
- Do not use urgency/priority labels in the first version.
- If one mail has multiple blocking reasons, show one item and expose the main reason first.

Recommended blocking reasons:

- Skill needs user selection or confirmation.
- Parse failed and automatic retry is not enough.
- Email body conflicts with attachment content.
- Customer recognition is unknown or ambiguous.
- Duplicate or revision needs user judgment.
- Document type is ambiguous.
- Template is unsupported or invalid.
- Customer/material mapping is missing.
- Extracted value has low confidence, missing field, abnormal quantity, or date/period mismatch.
- Business email has no processable attachment and needs manual handling.

Interaction:

- Clicking a mail attention item opens the related Customer Inbox mail detail.
- Resolution happens in Customer Inbox or Parse Review, not directly on the dashboard.

Follow-up reminder boundary:

- Missing expected mail is shown through heatmap highlighting.
- Reminder tasks can exist, but no-mail reminders should not be mixed into this right-side mail attention list unless there is a related received mail.

Expected data source:

- `MailAttentionItem` read model.

## Module 2: Customer Inbox / Mail Intake

### Page Goal

This page is the full mail and file intake archive.

It should allow users to see:

- Which customer emails have been ingested.
- Which attachments each email contains.
- Which emails have been processed.
- Which attachments are pending, processing, completed, failed, or waiting for human review.
- The original email title and body.

This page is a traceability and processing inspection view, not only a to-do list.

### Layout

Recommended layout:

- Left panel: customer-oriented mail list.
- Middle panel: selected mail original content.
- Right panel: AI attachment parse summaries and attachment-level actions.

The page should use the standard three-panel layout and keep Supply Chain subnav visible above the panels.

### Left Panel: Customer-Oriented Mail List

Default view:

- Group mails by customer, similar to mail folders.
- Within each customer, sort mails by received time descending.

Alternative view:

- Time-sorted mail stream without customer grouping.
- Sort all mails by received time descending.

Filters:

- Date range.
- Customer.
- Mail processing status.
- Has attachment.
- Needs human review.

Each mail row should show:

- Customer.
- Subject.
- Sender.
- Received time.
- Attachment count.
- Mail-level processing status badge.
- Open review count if any.

Mail-level status should consider:

- Attachment task status.
- Email body analysis task status.
- Open review tasks.

Expected data source:

- `CustomerMailFolder` and `MailListItem` read models.

### Middle Panel: Mail Original Content

Display:

- Selected mail subject.
- Sender, recipient, received time, matched customer, and mail-level status.
- Original email body text.
- Original HTML body may be supported later.

Interaction:

- Selecting a mail from the left panel loads the original mail content.
- Do not duplicate attachment-level actions in the middle panel.
- Do not support arbitrary body-text annotation in the first version.

No-attachment behavior:

- No-attachment mails should still be stored and visible.
- If the email body contains order changes or business instructions, the mail should require human review.
- Users should be able to jump to modify the final standardized result if needed.

Expected data source:

- `MailMessageDetail` read model.

### Right Panel: AI Attachment Parse Summaries

Sections:

- Attachment processing status list.
- AI parsing summary.
- Human review prompts.

Attachment status list should show:

- File name.
- File type.
- Parse task status.
- Extracted document type.
- Confidence.
- Error reason.
- Human review reason.
- Link to review or data verification page.
- Download original attachment action.

AI parsing summary:

- Email body analysis summary.
- Attachment classification result.
- Extracted document type.
- Extracted customer and material count.
- Extracted forecast or shipping line count.
- Confidence.
- Human review reason.
- Link to detailed parsing result or data verification page.

Manual actions:

- Rerun parsing for a selected attachment.
- Open related human review task.
- Open related data verification page.
- Open parsed result detail page.

Expected data source:

- `AttachmentParseSummaryPanel` read model.
- `AttachmentParseSummaryCard` read model.

## Module 3: Exception Handling / Human Intervention

### Page Goal

This page is a task-oriented work page for human intervention.

It should let users inspect:

- Which parse/review tasks need human intervention.
- Which source attachment or email body produced the task.
- What AI did while processing the task.
- Which skill was called or recommended.
- Which user decision is required before the pipeline can continue.
- Which completed tasks were handled successfully in the past.

### Layout

Recommended layout:

- Left panel: task queue.
- Middle panel: original source preview.
- Right panel: Agent Copilot timeline and decision area.

### Left Panel: Task Queue

Default:

- Show open human-intervention tasks.

Filters:

- Task status.
- Task type.
- Customer.
- Document type.
- Date range.

Optional switch:

- Open tasks.
- Completed tasks.

Each task row should show:

- Customer.
- File name.
- Task type.
- Review reason.
- Related mail received time.
- Task status.

Sorting:

- Sort by related mail received time ascending when available.
- Otherwise sort by task creation time ascending.

Expected data source:

- `HumanInterventionTaskItem` read model.

### Middle Panel: Original Source Preview

Display:

- Excel workbook/sheet preview for Excel tasks.
- PDF page preview for PDF tasks.
- Email body section for email-body-only tasks.
- Highlighted Excel cell/range, PDF page/region, or email text snippet when available.

The preview should be read-only.

Expected data source:

- `TaskSourcePreview` read model.

### Right Panel: Agent Copilot Timeline

Display:

- File received or email body received.
- Excel/PDF preprocessing.
- LLM/VLM extraction.
- Document classification.
- Business rule validation.
- Skill invocation or skill recommendation.
- Detected conflict or uncertainty.
- Structured result availability.
- Human decision options.
- Save/continue step after confirmation.

Expected data source:

- `AgentCopilotTimeline` read model.

### Parsed Result Review Dialog

The user must be able to see the task result before making meaningful corrections.

Interaction:

- Agent Copilot exposes a `View Result` action after a result is available.
- Clicking it opens a large dialog or full-page overlay.
- The dialog shows original source evidence and parsed result side by side.
- The dialog supports `salesForecast` and `shippingPlan` results.
- Users may correct parsed output values when the review task requires it.
- The original source file must not be modified.

Sales forecast result should show:

- Customer.
- Customer code.
- Material/customer part number.
- Internal part number.
- Program.
- Week key.
- Week start date.
- Parsed quantity.
- Source cell or source reference.
- Confidence.
- Corrected quantity if modified.

Shipping plan result should show:

- Customer.
- Customer code.
- Part number.
- Shipping date.
- Delivery note.
- Parsed quantity.
- Source cell/page/region reference.
- Confidence.
- Corrected quantity if modified.

Decision types:

- Confirm parsed result and continue.
- Apply skill recommendation to parsed result.
- Keep parsed result value.
- Manually correct parsed result value.
- Mark as duplicate.
- Mark as revised submission.
- Reject unsupported or invalid file.
- Send to manual data verification.

Expected data source:

- `ParsedResultReview` read model.

### Rerun History

Manual rerun should create a new parse task.

Frontend should expose:

- Current/latest parse result.
- Rerun action.
- Rerun history when available.
- Superseded result marker for old results.

## Module 4: Data Review / Standard Online Tables

### Page Goal

This page is the online version of the standardized `Sales Forecast` and `Shipping Plan` tables.

It is the main production data view used after customer emails and files have been parsed, reviewed, and normalized.

This page provides:

- Aggregated standard data.
- Cell/row-level lineage.
- Version comparison.
- Manual editing.
- Excel export.

### Layout

Recommended layout:

- Tab 1: Sales Forecast.
- Tab 2: Shipping Plan.
- Drawer or large side panel: cell/line lineage and version comparison.

### Sales Forecast Tab

Display:

- Matrix-style weekly forecast table.
- Rows represent customer/material/program context.
- Dynamic columns represent week keys.
- Quantity cells represent weekly forecast values.
- Changed cells should be visually marked.
- Manually edited cells should be visually marked.

Interactions:

- Click a quantity cell to open lineage drawer.
- Filter only rows/cells with changes.
- Search by customer part number or material number.
- Export as Excel.
- Manually edit values when allowed.

Expected data source:

- `SalesForecastTable` read model.

### Shipping Plan Tab

Display:

- Daily firm/shipping records.
- Customer.
- Customer code.
- Part number.
- Product.
- Shipping date.
- Delivery note.
- Actual quantity.
- HU.
- Pallet count.
- Plant.
- Customer service owner.
- Source file name.
- New/changed/manual-edited markers.

Interactions:

- Filter by shipping date.
- Search by customer, material, delivery note, or source file.
- Click a row or quantity cell to open lineage drawer.
- Export as Excel.
- Manually edit values when allowed.

Expected data source:

- `ShippingPlanTable` read model.

### Cell / Lineage Drawer

Purpose:

- Trace one displayed value back to source evidence and processing history.
- Show current value, previous value, and delta.
- Show whether a value was manually edited.

For sales forecast cells, show:

- Current quantity.
- Previous quantity.
- Delta quantity.
- Customer.
- Material.
- Week key.
- Source submission.
- Source email.
- Source attachment.
- Source sheet/cell or PDF region.
- Extraction result.
- Business rule or skill execution if involved.
- Human review decision if involved.
- Manual edit decision if involved.
- Audit timeline.

For shipping plan rows/cells, show:

- Current quantity.
- Previous value if available.
- Delta quantity if applicable.
- Customer.
- Material.
- Shipping date.
- Delivery note.
- Source PDF/Excel evidence.
- Extraction result.
- Human review decision if involved.
- Manual edit decision if involved.
- Audit timeline.

Expected data source:

- `ValueLineage` read model.

### Manual Editing

Manual edits should:

- Modify standardized table values, not original files.
- Require saving a correction record.
- Preserve previous value, new value, user, timestamp, reason when provided, and source reference.
- Visually mark manually edited cells/rows.
- Appear in lineage history.

## Module 5: Skill Studio

### Page Goal

This page lets users turn customer-specific planning and order handling experience into reusable agent skills.

Skill is a recommendation tool. It should not directly modify production data.

Users should be able to:

- Create skills with natural language.
- Review the generated skill document/result.
- Configure where the skill applies.
- Test the skill with historical files and parsed results.
- Activate useful skills.
- Disable skills without deleting history.

### Layout

Recommended layout:

- Left panel: skill list.
- Middle panel: skill scope, natural-language generation, generated result, and version list.
- Right panel: sandbox test using historical customer files.

The page should use the standard three-panel layout and keep Supply Chain subnav visible above the panels.

### Left Panel: Skill List

Display:

- Skill name.
- Status.
- The list should remain visually simple. Do not show customer overview or extra metadata in the first UI.

Actions:

- Create skill.
- Select skill.

Notes:

- Deleting a skill should be presented as disable/soft delete.
- Disabled skills must remain visible in historical trace when they were used before.

Expected data source:

- `SkillListItem` read model.

### Middle Panel: Skill Detail, Scope, Generation, And Versions

Display:

- Skill name.
- Current status.
- Status selector: `draft`, `active`, `disabled`.
- Applicable customers.
- Applicable target object: `salesForecast` or `shippingPlan`.
- Natural language input for skill generation.
- Generated skill document/result after the user triggers generation.
- Version list inside the panel.

Creation flow:

1. User clicks create skill.
2. User selects applicable customers.
3. User selects applicable target object, such as `salesForecast` or `shippingPlan`.
4. User enters a natural language description.
5. User clicks generate.
6. Worker/agent generates a skill document and executable representation.
7. User saves draft or saves as a new version.
8. User runs sandbox test in the right panel.
9. User can activate the skill after test confirmation.

Rules:

- Users do not need to see low-level executable scripts in the first UI.
- Backend should still store generated document, structured rule, executable representation, generation trace, and version data for export/inspection.
- Version switching belongs in the middle panel, not in the left list.
- Saving generated content should remind the user that a new version may affect future traceability.
- If test output has no meaningful adjustment, UI should warn that the skill may have low value.
- If test output does not match expectation, UI should suggest revising the skill description.
- Activation requires at least one user-confirmed sandbox test.
- No separate approval workflow is required.

Expected data source:

- `SkillStudioDetail` read model.
- `SkillVersionItem` read model.

### Right Panel: Sandbox Test

Purpose:

- Test whether the generated skill behaves as expected.
- Use real historical customer data without modifying production data.

Input selection:

- Customer choices should be constrained by the middle panel's applicable customer scope.
- Select one recent historical mail or attachment under selected customers.
- Use the selected file's existing parse result as skill input when available.
- If the selected file has no parse result, ask the user to parse it first.

Display:

- Selected customer.
- Selected historical mail/file.
- Input summary.
- Original parsed values.
- Skill recommendation.
- Suggested values.
- Delta values.
- Affected field paths.
- Explanation.
- Validation status: no useful effect, needs revision, useful.
- Optional natural-language revision suggestion when the test output is wrong.

Actions:

- Run sandbox test.
- Confirm sandbox output.
- Enter a natural-language revision suggestion and regenerate.
- Activate skill when activation conditions are satisfied.

Expected data source:

- `SkillSandboxPreview` read model.

### Active Skill Invocation Visibility

When active skills are called during task processing, users should see the skill usage in Agent Copilot.

Agent Copilot should show:

- Skill name.
- Skill version.
- Whether the skill was recommended by agent.
- Execution order if multiple skills are matched.
- Original value.
- Suggested value.
- Delta.
- Explanation.
- Whether human confirmation is required.

If multiple skills match:

- Agent may recommend execution order.
- User should confirm which skills and which order are acceptable before business output changes.
- Conflicting recommendations should be shown for user decision.

Expected data source:

- `SkillExecution` and `AgentCopilotTimeline` read models.

### Skill Safety

Skill safety rules:

- Active skills only produce recommendations.
- Active skills must not directly mutate `SalesForecastQuantity` or `ShippingPlanLine`.
- Skill output must be confirmed through review/decision flow before it affects business data.
- Active skill execution should not freely query historical data in the first version.
- Historical files/results can be used in sandbox testing.
- Historical business experience should be encoded by the user in the skill description or structured rule.

## Module 6: Customer Profile And Analytics

### Page Goal

This page analyzes customer shipping and forecast behavior.

It should help users understand:

- Which weeks had actual shipping activity for the selected customer.
- How much was shipped during a selected week.
- How the customer's previous forecast emails predicted the selected target week.
- Whether a customer's forecasts become more accurate as the target week approaches.
- Which materials have high forecast volatility.
- Which materials have large deviation between forecast and final shipping plan.
- Whether the customer tends to over-forecast or under-forecast.
- Which forecast lead time has meaningful planning value.

AI recommendations are display-only and must not automatically modify orders, skills, forecasts, or shipping plans.

### Layout

Recommended layout:

- Left panel: customer list.
- Middle panel: weekly shipping heatmap and selected-week detail.
- Right panel: material forecast evolution curve and AI evaluation.

The page should use the standard three-panel layout and keep Customer subnav visible above the panels.

### Left Panel: Customer List

Display:

- Customer name.
- Customer code.
- Last analytics refresh time.

Interactions:

- Select customer.
- Trigger manual refresh.

Expected data source:

- `CustomerProfileSummary` read model.

### Middle Panel: Weekly Shipping Heatmap And Selected-Week Detail

Default display:

- A full-year 52-week shipping heatmap for the selected customer.
- Each week cell shows shipping frequency/intensity by color depth.
- Selected week and date range should appear in the first block's upper-right area.
- Week cells can be displayed in a compact view when the user toggles view mode.
- Rolling windows such as 30/60/90 days should be supported and may cross year boundaries.

Interactions:

- Switch between yearly view and rolling windows, such as 30/60/90 days.
- In yearly view, year switching should be supported.
- Click a week cell to select target week and update the details below.
- Details below the heatmap should use tabs.

Selected-week detail tabs:

- This week's shipping detail: daily shipping rows for materials shipped in that week. A material can appear multiple times if it shipped on multiple days.
- Customer forecast situation: one row per material for the selected week, showing weekly shipping total and the customer's historical forecast quantities for that target week before the week arrived.

Important rules:

- Forecast versions are identified by mail received time.
- If a customer sends multiple forecast versions in one week, keep and show all versions.
- Shipping plan is daily but should be aggregated to week for customer profile comparison.
- Final actual quantity should use weekly aggregated `ShippingPlanLine.actualQty`.
- The middle panel should not include customer selection or project selection because the selected customer comes from the left panel.

Expected data source:

- `CustomerShippingWeekHeatmap` read model.
- `CustomerWeekDetail` read model.
- `CustomerWeeklyForecastComparison` read model.

### Right Panel: Material Forecast Evolution And AI Evaluation

Display:

- Material list for the selected week.
- Forecast evolution curve for the selected material and target week.
- Final weekly shipping quantity for comparison.
- AI evaluation generated from historical behavior.
- Last generated time.

AI recommendation examples:

- This customer's forecasts become reliable only within the final two weeks.
- This material has high volatility and should be watched before production planning.
- This customer frequently over-forecasts long-range demand.

Rules:

- Recommendations are display-only.
- Recommendations should not automatically create skills.
- Recommendations should not change orders or standardized tables.

Expected data source:

- `CustomerMaterialProfile` read model.
- `ForecastEvolutionSeries` read model.
- `CustomerRecommendation` read model.

### Source Trace

Users should be able to trace a forecast version point back to source evidence.

Interaction:

- Clicking a forecast version point opens a sheet or drawer.
- The drawer should show source email, source attachment, received time, sheet/cell or PDF region, extraction result, and related standardized value.

Expected data source:

- `ValueLineage` or customer-profile-specific trace read model.

### Refresh Strategy

The page should not recompute all analytics on every open.

Display:

- Last generated time.
- Manual refresh button.

Rules:

- Support scheduled refresh.
- Support manual refresh.
- Analysis date range should be user-selectable.
- Do not hard-code 3/6/12 month windows in the first version.

## Module 7: Financial Reconciliation

### Page Goal

This page compares a customer-side reconciliation target Excel file with internal shipping plan data and exports finance evidence.

It should help finance users:

- Select customer and reconciliation period.
- Upload customer-side target Excel.
- Preview the uploaded Excel.
- Execute comparison against Shipping Plan.
- See all comparison rows, including rows with no difference.
- Trace Shipping Plan details for a comparison row.
- Export difference evidence.

### Data Rules

- Upload file type is Excel only.
- PDF is not supported.
- User must select customer before upload.
- User must select a reconciliation period or date range before upload.
- Customer-side Excel template is expected to be consistent.
- Template validation should happen during upload.
- The UI should not expose comparison strategy selection.
- The backend should prefer matching by order number, order line, material, and period when available.
- Material-period aggregation can be used as fallback when order fields are missing.
- The comparison table should display full target-versus-shipping rows, not only differences.
- The page does not modify customer uploaded data or `ShippingPlanLine`.

Minimum uploaded Excel fields observed from the target file:

- Status.
- Received quantity.
- Quantity unit.
- Plant code.
- Plant name.
- Material number.
- Material name.
- Receipt date.
- Tax rate.
- Movement type.
- Receipt number.
- Receipt line.
- Receipt year.
- Order number.
- Order line.
- Order type.
- Currency.
- Reference receipt number.
- Reference receipt line.
- Reference receipt year.

Notes:

- Received quantity may be negative when it represents return/negative receipt.
- Movement type should be preserved but not hard-coded into accounting meaning until confirmed.
- Final template still needs customer confirmation.

### Layout

Recommended layout:

- Left panel: reconciliation task setup and history.
- Middle panel: uploaded target Excel preview.
- Right panel: complete target-versus-shipping comparison result.

The page should use the standard three-panel layout and keep Customer subnav visible above the panels.

### Left Panel: Reconciliation Task Setup And History

Display:

- Selected customer.
- Selected period or date range.
- Uploaded file name and parse status.
- Upload and execute comparison actions.
- Scrollable reconciliation history.
- Delete/archive action for history items.

Interaction:

- Select customer.
- Select reconciliation period/date range.
- Upload Excel.
- Execute comparison.
- Open previous comparison history.
- Delete/archive a history item.

Expected data source:

- `ReconciliationWorkspace` read model.
- `ReconciliationHistoryItem` read model.

### Middle Panel: Uploaded Target Excel Preview

Display:

- Uploaded file name.
- Template validation status.
- Parsed field status.
- Original-like Excel preview rows.

Rules:

- Preview should preserve the source file shape enough for finance users to recognize it.
- Preview does not edit uploaded file data.

Expected data source:

- `TargetFilePreviewRow` read model.

### Right Panel: Target File Vs Shipping Result

Display:

- Material number.
- Target file quantity.
- Shipping Plan quantity.
- Difference quantity.
- Status.
- Highlight marker.
- All rows, including matched rows with zero difference.
- Optional order number and order line in detail/source trace.

Statuses:

- `matched`
- `different`
- `onlyInTarget`
- `onlyInShippingPlan`
- `needsReview`

Interaction:

- Highlight difference rows.
- Open Shipping Plan detail sheet for one comparison row.
- Save result if needed.
- Export difference PDF.

Expected data source:

- `ReconciliationComparisonRow` read model.
- `ShippingPlanMatchDetail` read model.

### Export PDF

Exported PDF should include:

- Selected customer.
- Period/date range.
- Uploaded source file information.
- Difference table.
- Job-level remark.
- Supporting source references.
- Generated time.
- Operator.

The export should not rewrite historical reports automatically if shipping plan data changes later.

### Reconciliation History

Reconciliation results should be saved for history.

Possible UI:

- Reconciliation history is shown in the left panel below the current task setup.
- History list should scroll internally and support delete/archive action.

History item should show:

- Customer.
- Date range.
- Uploaded file.
- Created time.
- Difference count.
- Export status.
- Stale/changed-data warning if related shipping plan changed after completion.

Open design point:

- Whether stale/changed-data warning is required in first implementation.
- If implemented, historical reconciliation should store a comparison snapshot and flag affected jobs when related shipping plan data changes.

## Module 8: System Configuration

### Page Goal

This page manages low-frequency system and master-data settings.

It should remain lightweight. The first version should not become a complex admin backend.

The configuration model should be customer-centric where possible:

- Customer basic information.
- Customer sender recognition rules.
- Customer submission reminder schedule.
- Customer material mapping.

Global settings should be limited to:

- Local user management.
- Unified listener mailbox configuration.

### Layout

Recommended layout:

- Left panel: configuration menu.
- Right panel: selected configuration section.
- Customer and user sections can use internal split cards inside the right panel.

Suggested left navigation items:

- Customer configuration.
- User management.
- Unified mailbox.

Do not expose threshold configuration UI in the first version.

Thresholds such as confidence threshold, volatility threshold, large deviation threshold, and reconciliation difference threshold can remain backend configuration first.

### User Management

Purpose:

- Manage internal users.
- Support simple account/password login.
- Control whether a user can access System Configuration.

Layout:

- User list inside the right configuration panel.
- Selected user detail beside the list inside the same panel.

Display:

- Email.
- Display name.
- Role.
- Status.
- Last login time.

Actions:

- Create user.
- Edit display name or role.
- Reset password.
- Enable/disable user.

Rules:

- No email verification code is required in the first version.
- No MFA is required in the first version.
- Role permission only controls access to System Configuration in the first version.
- Other business pages can remain visible to all internal users unless later requirements change.

Expected data source:

- `UserConfigItem` read model.
- `UserConfigDetail` read model.

### Customer Configuration

This should be the main configuration area.

Instead of creating many separate customer-related configuration pages, use one customer detail page with multiple tabs or sections.

Layout:

- Customer list inside the right configuration panel.
- Selected customer detail beside the list.
- Customer detail uses tabs.

Recommended customer configuration sections:

- Basic info.
- Sender recognition.
- Reminder schedule.
- Material mapping.

Customer list should support:

- Search by customer name or customer code.
- Filter by active/inactive status.
- Select customer to edit details.

#### Basic Info

Display:

- Customer name.
- Customer code.
- OEM.
- Program.
- Default customer service owner.
- Status.

Actions:

- Create customer.
- Edit customer.
- Disable customer.

#### Sender Recognition

Purpose:

- Identify which customer a received email belongs to.

Display:

- Sender email.
- Sender domain.
- Subject/body keyword rules.
- Priority.
- Status.

Actions:

- Add sender email.
- Add sender domain.
- Add recognition keyword.
- Disable recognition rule.

Rules:

- One customer may have multiple sender emails.
- One customer may have multiple sender domains.
- Customer identification can use a combination of sender email, sender domain, subject keywords, and body keywords.
- Rules should be previewable or testable later, but the first version can start with CRUD and validation.

#### Reminder Schedule

Purpose:

- Support customer-service follow-up reminders when expected customer orders are overdue.

Display:

- Expected submission frequency.
- Expected submission day/time.
- Grace period.
- Reminder enabled/disabled.
- Last received mail time.
- Next expected submission time.

Actions:

- Create or edit reminder schedule.
- Enable/disable reminder.

Rules:

- Reminder produces an internal reminder task first.
- Follow-up email content can be generated later by the customer service workflow.
- The system should not automatically send customer follow-up emails without user confirmation.

#### Material Mapping

Purpose:

- Map customer material identifiers to internal material identifiers.

Display:

- Customer part number.
- Internal part number.
- SA.
- Product type.
- Production line.
- OEM.
- Program.
- Product.
- Status.

Actions:

- Import mapping from Excel.
- Validate imported rows.
- Preview import result.
- Confirm import.
- Edit individual mapping rows when needed.
- Disable mapping row.

Import validation should show:

- Total rows.
- Valid rows.
- Invalid rows.
- Duplicate rows.
- Missing required columns.
- Rows that conflict with existing mappings.

Rules:

- Excel import is expected because customer/material mapping already exists in external files.
- Required columns and exact template should be confirmed with the customer.
- Duplicate detection should happen before import confirmation.
- Import should not silently overwrite existing mappings.

Expected data source:

- `CustomerConfigListItem` read model.
- `CustomerConfigDetail` read model.
- `MaterialImportPreview` read model.

### Unified Mailbox

Purpose:

- Configure the single mailbox used for inbound customer email ingestion and outbound user-confirmed reminder email sending.

Display:

- Mailbox address.
- Provider type.
- Sync interval.
- Enabled/disabled.
- Connection status.
- Last sync time.
- Last connection test time.

Actions:

- Update mailbox configuration.
- Test connection.
- Enable/disable mailbox sync.

Rules:

- The first version supports only one unified listener mailbox.
- Multiple active listener mailboxes are not supported.
- Replacing the mailbox means updating the single mailbox configuration.
- Secrets and tokens must not be shown in plaintext.
- Manual mailbox sync can also be exposed from the Customer Inbox.

Expected data source:

- `MailboxConfigView` read model.

### Open Design Points

- Final material mapping Excel template.
- Whether sender-recognition rules need a test button in the first version.
- Whether threshold configuration needs UI after real data is available.

## Open Questions

- Final route names.
- Whether manual editing requires a reason in all cases.
- Whether Data Review edits happen inline, through a dialog, or both.
- Whether completed task history should be visible by default or behind a filter.
- Whether stale/changed-data warning for financial reconciliation history is required in the first implementation.
