# AGENT.md

Target project location: `AGENT.md`

Status: Draft v0.1.

## Project Overview

This workspace contains the Supply Chain Agent project.

The system receives customer order emails and attachments, extracts order information from different document formats, normalizes the data into internal order, sales forecast, and shipping plan structures, supports human review for uncertain or conflicting results, and provides traceability, export, customer analytics, and financial reconciliation workflows.

The current `order-agent-poc` is a product and UI prototype reference. The production project should be implemented as three separate modules:

- `frontend`: user interface and human workflow.
- `server`: business domain, mail operations, APIs, permissions, state transitions, persistence, and audit.
- `worker`: LLM/VLM pipeline execution, document classification, extraction, confidence scoring, trace generation, and async processing.

## Workspace Modules

### frontend

The frontend owns:

- User-facing pages and routes.
- Login and session UI.
- Mail/task workspace.
- Human review and exception handling UI.
- Data verification UI.
- Skill studio UI.
- Customer profile and analytics UI.
- Financial reconciliation UI.
- System configuration UI.
- API client modules for calling `server`.

The frontend must not directly call the worker, LLM providers, database, object storage, or queue.

### server

The server owns:

- Business domain models.
- API contract.
- Authentication and authorization.
- User, role, customer, product, and business configuration.
- Mailbox integration, inbound mail reading, and reminder mail sending.
- Order, forecast, shipping plan, review task, reconciliation, export, and audit state.
- State transitions and guard clauses.
- Persistence and object storage coordination.
- Audit trail and traceability records.
- Worker task dispatch and worker result ingestion.

The server is the source of truth for business state.

### worker

The worker owns:

- Document classification.
- Excel / PDF / image parsing.
- LLM / VLM provider calls.
- Extraction workflow execution.
- Confidence scoring.
- Retry, timeout, and fallback handling.
- Structured extraction result generation.
- Trace artifact generation.
- Async task execution and callback/reporting to `server`.

The worker must not read mailboxes, send emails, or decide final business state.

## Architecture Boundaries

- `frontend` only calls `server` APIs.
- `frontend` does not call `worker`, LLM providers, databases, object storage, or queues directly.
- `server` owns business truth, permissions, persistence, state transitions, mail operations, and audit.
- `worker` produces extraction results, confidence scores, traces, and errors.
- Final order confirmation, review resolution, reconciliation status, and export status belong to `server`.
- Any AI-generated value must be traceable to source mail, attachment, page/sheet/cell, prompt/workflow version, and processing step.
- Any human correction must preserve original value, corrected value, user, timestamp, and reason.
- Frontend, server, and worker may work in parallel only after the API/event contract is stable.
- Any API, event, or schema change must update `docs/contracts/api-event-contract.md` first.

## Documentation Workflow

Phase 1 must create and maintain these artifacts in order:

1. `AGENT.md`
2. `docs/architecture/system-overview.md`
3. `docs/requirements/supply-chain-agent.md`
4. `server/docs/domain-requirement.md`
5. `worker/docs/worker-requirement.md`
6. `docs/contracts/api-event-contract.md`
7. `frontend/docs/frontend-requirement.md`
8. `docs/plans/implementation-plan.md`
9. `docs/test-plans/supply-chain-agent-test-plan.md`

Implementation must follow the requirement and contract documents.

Do not implement business behavior that is not represented in the requirement, domain, worker, or contract documents.

## Document Content Rules

### `docs/architecture/system-overview.md`

Must include:

- Project goal.
- System context.
- Module boundaries.
- End-to-end data flow.
- User roles.
- External systems.
- Storage boundaries.
- Async processing boundaries.
- Permission and audit principles.
- Non-goals.

### `docs/requirements/supply-chain-agent.md`

Must include:

- Business goal.
- User roles.
- Core scenarios.
- Main user flows.
- Business modules.
- Cross-module rules.
- Human intervention rules.
- Traceability requirements.
- Export requirements.
- Permission expectations.
- Failure and edge cases.
- Out of scope.
- Open questions.

### `server/docs/domain-requirement.md`

Must include:

- Backend scope.
- Domain ownership.
- Core entities.
- Entity fields.
- Entity relationships.
- Entity state models.
- Operations / use cases.
- Business rules.
- Guard clauses.
- Permission rules.
- Validation rules.
- Persistence notes.
- API mapping draft.
- Audit requirements.
- Open questions.

Backend requirements must be domain-driven, not page-driven.

Define entities before endpoints. Define state transitions before implementing actions. Define guard clauses for every operation.

### `worker/docs/worker-requirement.md`

Must include:

- Worker scope.
- Input sources.
- Document classification.
- Extraction workflow.
- LLM / VLM usage rules.
- Input schema.
- Output schema.
- Confidence scoring.
- Human intervention trigger.
- Retry / timeout policy.
- Error handling.
- Trace generation.
- Security constraints.
- Integration with server.
- Non-goals.

### `docs/contracts/api-event-contract.md`

Must include:

- Contract ownership rules.
- REST API conventions.
- Auth convention.
- Error response format.
- Pagination and filtering format.
- File upload/download contract.
- Job lifecycle contract.
- Event schema.
- Queue message schema.
- Server-to-worker requests.
- Worker-to-server callbacks.
- Frontend API dependencies.
- Versioning policy.
- Backward compatibility rules.
- Contract change process.

### `frontend/docs/frontend-requirement.md`

Must include:

- Frontend scope.
- Routes / pages.
- User roles per page.
- Page goals.
- UI modules.
- User actions.
- API dependencies.
- Loading states.
- Empty states.
- Error states.
- Review interactions.
- Traceability interactions.
- Export interactions.
- Permission-based UI behavior.
- Out of scope.

### `docs/plans/implementation-plan.md`

Must include:

- Implementation phases.
- Milestones.
- Module ownership.
- Dependency order.
- Deliverables per phase.
- Parallelizable tasks.
- Blocking tasks.
- Verification checklist.
- Risks.
- Rollout plan.

### `docs/test-plans/supply-chain-agent-test-plan.md`

Must include:

- Test scope.
- Requirement coverage matrix.
- Unit test targets.
- Integration test targets.
- Worker test targets.
- Contract test targets.
- System test scenarios.
- Browser/computer-use test checklist.
- Permission test cases.
- Failure test cases.
- Regression checklist.
- Acceptance criteria.

## Business Modules

The project should cover these business modules:

- Mail ingestion / perception workspace.
- Intelligent customer service workspace.
- Exception handling / human review.
- Data verification and traceability.
- Skill studio.
- Customer profile and analytics.
- Financial reconciliation.
- System configuration.

## Core Domain Objects

Initial domain objects may include:

- `User`
- `Role`
- `Customer`
- `Product`
- `MailSource`
- `MailMessage`
- `MailAttachment`
- `IngestionJob`
- `ParseTask`
- `ExtractionResult`
- `NormalizedOrder`
- `ReviewTask`
- `AuditTrace`
- `SkillDefinition`
- `SkillActivationRule`
- `ForecastSnapshot`
- `FirmOrder`
- `ShippingPlan`
- `ReconciliationJob`
- `ReconciliationLine`
- `ExportArtifact`

The final entity list must be defined in `server/docs/domain-requirement.md`.

## Frontend Rules

- Use Next.js App Router.
- Use TypeScript with strict typing.
- Use Tailwind CSS.
- Use shadcn/ui and Radix-based primitives when possible.
- Use TanStack Table for complex tables.
- Use TanStack Form for complex forms.
- Use Lucide React icons.
- Use `next-intl` for internationalization when multilingual UI is in scope.
- Support Simplified Chinese first. Keep the structure ready for Traditional Chinese and English.
- Use kebab-case file names.
- Prefer named exports, except for Next.js pages and layouts.
- Explicitly type React state.
- Keep API calls inside frontend API client modules.
- Do not hard-code backend URLs in components.
- Keep operational pages dense, scannable, and workflow-oriented.
- Use loading, empty, error, and permission states for all data-driven views.

## Server Rules

- Use FastAPI with async-first design.
- Use clean architecture.
- Keep API endpoints thin.
- Put business logic in services.
- Put database access in repositories.
- Use dependency injection with FastAPI `Depends()`.
- Use MongoDB for document persistence.
- Use Redis for cache, session, rate limit, or short-lived state where needed.
- Use MinIO or object storage for uploaded attachments, source files, generated exports, and trace artifacts.
- Use Pydantic V2.
- Use camelCase for frontend-facing API schemas.
- Keep ObjectId inside persistence models and convert to string at API boundaries.
- Use soft delete with `deleted_at`.
- Use timezone-aware UTC datetimes only.
- Use `structlog` for structured logging.
- Use `httpx` for HTTP calls.
- Use custom exceptions and global handlers for consistent API errors.
- Do not access the database directly from API endpoints.
- Do not use blocking I/O in async flows.
- Do not use `requests`.
- Do not use `print`.
- Do not use `datetime.now()` without timezone.
- Do not use generic `except Exception` without proper context and logging.

## Worker Rules

- Use async I/O for file, HTTP, and provider calls.
- Use structured schemas for all task inputs and outputs.
- Worker output must include extracted data, confidence score, source references, trace steps, warnings, and error details.
- Store raw inputs and generated trace artifacts for audit.
- Use retry and timeout policies for storage and LLM/VLM provider calls.
- Use `httpx` for external HTTP calls.
- Use structured logging.
- Track LLM metrics where possible:
  - request count
  - latency
  - token usage
  - error rate
  - rate limit events
- Do not read mailboxes.
- Do not send emails.
- Do not directly mutate final business order state.
- Do not bypass server authorization or persistence rules.

## API And Event Rules

- API schemas must be explicit and versionable.
- All async jobs must expose a lifecycle state.
- All worker callbacks must be idempotent.
- Every task must have a correlation ID.
- Every parsed result must link back to source mail and attachment.
- All errors must use a consistent response shape.
- Frontend-facing fields should use camelCase.
- Internal Python models may use snake_case.
- Breaking contract changes require updating documentation and dependent modules together.

Recommended async job states:

- `created`
- `queued`
- `processing`
- `needsReview`
- `completed`
- `failed`
- `cancelled`

## Testing Rules

- Unit tests must cover business rules, validators, state transitions, parsers, and pure services.
- Integration tests must cover endpoint + service + repository flows.
- Worker tests must cover classification, extraction schema, confidence handling, retry, timeout, and callbacks.
- Contract tests must cover frontend/server/worker schema compatibility.
- System tests must cover login, mail/task list, human review, data verification, export, and reconciliation.
- Browser or computer-use tests should verify important user flows through the real UI.
- Test plans must map back to requirement and contract documents.

## Safety Rules

- Do not use destructive delete commands such as `rm -rf`.
- Do not use `rm -r`, `git clean`, `git reset --hard`, or commands that recursively delete project files unless the user explicitly approves the exact action.
- Do not delete user-created files, generated artifacts, uploaded samples, documentation, or prototype assets unless the task explicitly asks for it.
- Prefer non-destructive cleanup, archiving, or moving files to a clearly named backup folder when cleanup is needed.
- Before any risky filesystem operation, explain what will be affected and wait for approval.
- Do not overwrite existing work without checking current file contents.
- Do not revert changes made by others unless explicitly requested.

## Collaboration Rules

- Prefer Chinese for business discussion and requirement clarification.
- Prefer English for code, file names, identifiers, commands, API schemas, and technical constants.
- Keep plans artifact-oriented.
- Keep requirements testable.
- Record open questions instead of hiding uncertainty inside implementation.
- When a requirement is unclear, document the assumption before implementing.
- When contract and implementation disagree, update or discuss the contract first.
