# Order Agent Development Architecture 2.0

Status: Active foundation.

## Workspace

```text
order-agent-poc/
  html prototype 3.0/       preserved product prototype
  phase-1-docs/             requirements and contracts
  order-agent-frontend/     Next.js user interface
  order-agent-backend/      FastAPI business source of truth
  order-agent-worker/       FastAPI/Python document worker
```

This structure follows the independent web/server/worker organization used by `CEDD_audio`.

## Frontend

Uses:

- `src/app` for production routes.
- `src/api` for backend-only API clients.
- `src/types` for frontend contracts.
- `public/prototype-3.0` as the visual migration baseline.

The frontend must never call worker, Knowlytics, mailbox, database, or object storage directly.

## Backend

Required folders:

- `app/model`: domain models and state.
- `app/service`: business use cases and guard clauses.
- `app/endpoint`: REST endpoints.
- `app/repository`: persistence protocol and implementations.
- `app/adapter`: mailbox and external-system adapters.

The current in-memory repository supports deterministic tests before MongoDB is connected. A production MongoDB implementation must preserve the same service behavior and optimistic concurrency guarantees.

Repository contract tests exercise persistence behavior without Outlook or external infrastructure. The same contract should later be run against the MongoDB repository in integration CI.

## Worker

Required folders:

- `app/parser`: deterministic Excel/PDF parsing.
- `app/client`: Knowlytics and callback clients.
- `app/service`: task dispatch and processing pipeline.
- `app/model`: worker request/result contracts.
- `app/endpoint`: worker HTTP surface.

Knowlytics follows the CEDD/HR gateway contract:

```text
POST {base_url}/llm/completion/create
Authorization: Bearer {api_key}
```

## Mail Architecture

SMTP cannot read mail. It is only an outbound transport.

Inbound Outlook options:

1. IMAP adapter when Outlook IMAP access is enabled.
2. Microsoft Graph adapter for app-only enterprise mailbox access.
3. Test/import adapter for local and automated tests.

All adapters normalize messages into the same `NormalizedInboundMail` contract before calling `MailIngestionService`.

## Test Strategy

### Backend

- Mail creation and attachment checksum.
- Message-id idempotency.
- Processing task creation.
- Review commit history.
- `resultRevision` conflict protection.
- Confirm/publish state transition.
- Endpoint smoke tests.

### Worker

- Generated Excel workbook parsing.
- Generated PDF parsing.
- Extension routing and unsupported formats.
- Knowlytics request contract through an injected fake transport.
- Endpoint smoke tests.

### Frontend

- Phase 1 route/navigation contract.
- Build/lint.
- Add browser E2E tests as production pages replace static prototypes.

External integration tests for IMAP/Graph, MongoDB, object storage, and Knowlytics must be separate from the deterministic default suite and enabled only when credentials/services are available.
