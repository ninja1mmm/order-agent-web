# Phase 1 Documentation Workspace

This folder stores the Phase 1 planning documents for the Supply Chain Agent project before the production repositories are split into `frontend`, `server`, and `worker`.

## Document Map

| Status | Draft file in this folder | Target project location |
| --- | --- | --- |
| Drafted | `AGENT.md` | Workspace root: `AGENT.md` |
| Drafted | `system-overview.md` | `docs/architecture/system-overview.md` |
| Drafted | `supply-chain-agent.md` | `docs/requirements/supply-chain-agent.md` |
| Drafted | `domain-requirement.md` | `server/docs/domain-requirement.md` |
| Drafted | `backend-domain-requirement-2.0.md` | `server/docs/backend-domain-requirement-2.0.md` |
| Drafted | `backend-service-2.0.md` | `server/docs/backend-service-2.0.md` |
| Drafted | `backend-service-2.0.zh-CN.md` | `server/docs/backend-service-2.0.zh-CN.md` |
| Pending | `backend-worker-mocked-2.0.md` | `server/docs/backend-worker-mocked-2.0.md` |
| Pending | `backend-endpoint-2.0.md` | `server/docs/backend-endpoint-2.0.md` |
| Pending | `worker-requirement.md` | `worker/docs/worker-requirement.md` |
| Pending | `api-event-contract.md` | `docs/contracts/api-event-contract.md` |
| Drafted | `frontend-requirement.md` | `frontend/docs/frontend-requirement.md` |
| Drafted | `implementation-plan.md` | `docs/plans/implementation-plan.md` |
| Drafted | `urgent-delivery-plan-2.0.zh-CN.md` | `docs/plans/urgent-delivery-plan-2.0.zh-CN.md` |
| Drafted | `development-architecture-2.0.md` | Workspace architecture reference |
| Pending | `supply-chain-agent-test-plan.md` | `docs/test-plans/supply-chain-agent-test-plan.md` |

## Recommended Authoring Order

1. `AGENT.md`
2. `system-overview.md`
3. `supply-chain-agent.md`
4. `domain-requirement.md`
5. `backend-domain-requirement-2.0.md`
6. `backend-service-2.0.md`
7. `backend-worker-mocked-2.0.md`
8. `backend-endpoint-2.0.md`
9. `worker-requirement.md`
10. `api-event-contract.md`
11. `frontend-requirement.md`
12. `implementation-plan.md`
13. `supply-chain-agent-test-plan.md`

## Notes

- The files in this folder are planning drafts.
- When the production project structure is created, move or copy each document to its target location listed above.
- Contract and implementation work should not start before `backend-domain-requirement-2.0.md`, `backend-service-2.0.md`, `backend-worker-mocked-2.0.md`, and `backend-endpoint-2.0.md` are aligned.
- Backend 2.0 documents use the `backend-*` prefix so they can later move together into the `server` project.
- `backend-domain-requirement-2.0.md` is the backend-prefixed copy of the current domain model. Keep `domain-requirement-2.0.md` unchanged unless the model itself changes.
- `backend-service-2.0.zh-CN.md` is a Chinese review copy. Keep English service names and collection names as the canonical implementation terms.
- `urgent-delivery-plan-2.0.zh-CN.md` is the current Phase 1 scope, priority, estimate, and launch-readiness reference for the urgent four-page delivery.
