# Backend Worker Mocked Contract 2.0

Target project location: `server/docs/backend-worker-mocked-2.0.md`

Status: Pending.

This document will define the mocked worker contracts required by backend services before the real worker is implemented.

Planned scope:

- Worker task request envelope.
- Worker callback envelope.
- `email_body_analysis` mocked result.
- `classify_document` mocked result.
- `extract_forecast` mocked result with `normalizedRows[]`.
- `extract_shipping` mocked result with `normalizedRows[]`.
- `extract_reconciliation` mocked result.
- `generate_skill_version` mocked result.
- `execute_skill_sandbox` mocked result.
- Low-confidence, failure, timeout, unsupported template, and waiting-human-decision examples.
- Idempotency and retry behavior.

This document depends on `backend-service-2.0.md`.
