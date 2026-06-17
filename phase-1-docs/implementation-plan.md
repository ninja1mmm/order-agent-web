# Implementation Plan

Target project location: `docs/plans/implementation-plan.md`

Status: Draft v0.1.

## Purpose

This document defines the milestones required before and during implementation of Supply Chain Agent.

The immediate purpose is to answer:

- What work remains before coding can start safely?
- Which documents are blocking implementation?
- Which decisions must be clarified?
- Which parts can be implemented with mock worker results first?
- Which parts can be parallelized after contracts are stable?

For the urgent delivery of Intelligent Service, Task Workbench, Parse Review, and Orders, use `urgent-delivery-plan-2.0.zh-CN.md` as the current scope and sequencing override.

## Implementation Readiness Principle

Implementation does not require every detail to be perfect.

Implementation can start when these items are stable enough:

- Business modules and user flows are known.
- Domain entities and states are defined.
- Page actions are mapped to backend services.
- Worker mock result schema is defined.
- API/event contract is stable enough for frontend and server integration.
- Open questions are categorized as blocking or non-blocking.

## Current Status Summary

### Completed Or Mostly Drafted

- Workspace rules: `AGENT.md`.
- System architecture overview: `system-overview.md`.
- Shared business requirement: `supply-chain-agent.md`.
- Frontend module requirement: `frontend-requirement.md`.
- Initial domain entities and read models: `domain-requirement.md`.

### Still Required Before Full Implementation

- Page action to service mapping.
- Domain service/use case definitions.
- State transition and guard clause review.
- Worker mock input/output contract.
- API and event contract.
- Backend implementation module plan.
- Frontend route/API dependency plan.
- Test plan and acceptance checklist.

## Milestone Overview

| Milestone | Name | Goal | Coding readiness impact |
| --- | --- | --- | --- |
| M0 | Context foundation | Establish project rules, architecture, business scope, and frontend modules | Mostly done |
| M1 | Frontend-to-domain alignment | Map each page action to read models, services, entities, and state changes | Required before stable API design |
| M2 | Server domain service design | Define backend services, commands, state transitions, guard clauses, and persistence ownership | Required before backend coding |
| M3 | Worker mock contract | Define mock worker requests/results so server can run the process without real worker | Required before server workflow coding |
| M4 | API/event contract | Define REST APIs, worker events, callbacks, errors, pagination, uploads, downloads, and auth | Required before frontend/server parallel coding |
| M5 | Implementation sequencing | Define project structure, modules, milestones, dependencies, and parallel work | Required before formal implementation |
| M6 | Test and acceptance plan | Define unit, integration, contract, worker mock, and system test scenarios | Required before declaring implementation complete |

## M0: Context Foundation

Status: Mostly done.

Deliverables:

- `AGENT.md`.
- `system-overview.md`.
- `supply-chain-agent.md`.
- `frontend-requirement.md`.
- Initial `domain-requirement.md`.

Remaining checks:

- Confirm whether all frontend modules are still in scope.
- Confirm whether any POC-only UI should be explicitly out of scope.
- Confirm whether business language is consistent across documents.

## M1: Frontend-To-Domain Alignment

Goal:

- Convert frontend page descriptions into implementable backend needs.

Main output:

- Add a `Page Action / Service Matrix` section to `domain-requirement.md`.

For each frontend module, define:

- Page read models.
- User actions/buttons.
- Backend command/service triggered by each action.
- Entities changed by each service.
- State transitions caused by each service.
- Audit records created.
- Worker mock dependency, if any.
- Data refresh requirement after action succeeds.

Modules to cover:

- Intelligent customer service workspace.
- Perception workspace / file intake.
- Exception handling / human intervention.
- Data review / standard online tables.
- Skill studio.
- Customer profile and analytics.
- Financial reconciliation.
- System configuration.

Acceptance criteria:

- Every important button has a backend service or is marked frontend-only.
- Every service-changing action identifies affected entities.
- Every review/confirmation action has a state transition.
- Every read-only page has read models defined.
- Open questions are clearly marked as blocking or non-blocking.

## M2: Server Domain Service Design

Goal:

- Define the backend application services before writing endpoints.

Main output:

- Add service/use case definitions to `domain-requirement.md`.

Service groups:

- Auth and user services.
- Customer configuration services.
- Mailbox ingestion services.
- Customer recognition services.
- Submission and attachment services.
- Parse task orchestration services.
- Review task services.
- Standardized sales forecast services.
- Standardized shipping plan services.
- Skill studio services.
- Reminder services.
- Customer profile analytics services.
- Financial reconciliation services.
- Export services.
- Audit and lineage services.

Each service should define:

- Purpose.
- Input command.
- Output/result.
- Entities read.
- Entities written.
- State transitions.
- Guard clauses.
- Errors.
- Audit requirements.
- Whether worker is required or mocked.

Acceptance criteria:

- Backend can be implemented without inventing new business behavior during coding.
- Service names are stable enough to map to endpoint names.
- Worker-dependent services can run with mock results.

## M3: Worker Mock Contract

Goal:

- Allow server and frontend workflows to be implemented before the real worker is complete.

Main outputs:

- Update `worker-requirement.md`.
- Add worker sections to `api-event-contract.md`.
- Create mock result examples for Excel, PDF, email body, and skill generation/execution.

Mock worker result types:

- Email body classification result.
- Attachment document classification result.
- Sales forecast extraction result.
- Shipping plan extraction result.
- Skill structured rule generation result.
- Skill sandbox execution result.
- Trace/evidence result.
- Worker failure result.

Acceptance criteria:

- Server can create parse tasks and ingest mock worker callbacks.
- Server can produce review tasks from mock low-confidence or ambiguous results.
- Frontend can display realistic AI timeline, parsed result, and lineage from mock data.

## M4: API And Event Contract

Goal:

- Convert domain services and read models into stable contracts.

Main output:

- Complete `api-event-contract.md`.

Contract sections:

- Auth APIs.
- Current user API.
- Customer configuration APIs.
- Mailbox configuration and sync APIs.
- Mail message and attachment APIs.
- Parse task APIs.
- Review task APIs.
- Sales forecast APIs.
- Shipping plan APIs.
- Skill studio APIs.
- Reminder APIs.
- Customer profile APIs.
- Financial reconciliation APIs.
- Export/file APIs.
- Audit/lineage APIs.
- Worker request/event schemas.
- Worker callback schemas.
- Error format.
- Pagination/filtering format.
- Upload/download conventions.

Acceptance criteria:

- Frontend can implement API clients from the contract.
- Server can implement endpoints from the contract.
- Worker can later replace mock results without changing frontend APIs.
- Contract includes enough examples for common flows.

## M5: Implementation Sequencing

Goal:

- Decide how to build the three modules with minimal rework.

Recommended implementation order:

1. Create production project structure: `frontend`, `server`, `worker`.
2. Copy finalized docs into target project locations.
3. Implement server foundation: auth, config, persistence, common errors, audit, file storage.
4. Implement server domain services with mock worker results.
5. Implement server REST APIs.
6. Implement frontend API clients and pages against server.
7. Implement worker real pipelines behind the same contract.
8. Replace mock worker adapter with queue/callback integration.
9. Run integration and system validation.

Parallelization rules:

- Frontend and server can work in parallel only after `api-event-contract.md` is stable.
- Worker can work in parallel after worker input/output contract is stable.
- UI visual work can start earlier, but data-changing actions should wait for service/API mapping.

## M6: Test And Acceptance Plan

Goal:

- Define what must pass before the implementation is considered complete.

Main output:

- Complete `supply-chain-agent-test-plan.md`.

Test layers:

- Unit tests for services, validators, state transitions, and guard clauses.
- Integration tests for endpoint + service + repository flows.
- Contract tests for frontend/server and server/worker schemas.
- Worker mock tests for parse task lifecycle.
- System tests for real UI flows.
- Export verification for Excel and PDF outputs.

Acceptance criteria:

- Main business flows can be tested from login through data confirmation/export.
- Failure paths are tested, not only happy paths.
- Human review and audit trace are verifiable.

## Remaining Work Before Parallel Implementation

High-priority todo:

- Freeze the urgent four-page scope and remaining blocking business decisions.
- Define worker mock result schemas, callbacks, idempotency, and examples.
- Complete the urgent four-page and minimum-system-settings endpoint contract.
- Define Parse Review commit/confirm state transitions and conflict responses.
- Define integration and acceptance tests for the first end-to-end flow.

Medium-priority todo:

- Finalize frontend route names.
- Finalize project directory structure.
- Decide exact export templates.
- Decide exact material mapping import template.
- Decide whether financial reconciliation stale-warning is first-phase or later.

Can be postponed:

- Real worker model/provider selection details.
- Threshold tuning UI.
- Advanced admin permission model.
- Multi-language content beyond Simplified Chinese.

## Recommended Next Step

Start M3 and M4 for the urgent four-page scope.

The page action/service matrix and backend service matrix are now drafted. The immediate blockers are:

- Complete `backend-worker-mocked-2.0.md`.
- Complete the four-page and minimum-system-settings sections of `backend-endpoint-2.0.md`.
- Freeze Parse Review cell-edit commit and optimistic-concurrency behavior.
- Define the matching integration and acceptance tests.
