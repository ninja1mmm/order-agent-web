# Supply Chain Agent HTML Prototype 2.0

This folder contains static HTML pages for reviewing the frontend structure before converting the design into JSX.

## Navigation Map

| Top navigation | Page | File |
| --- | --- | --- |
| 智能客服 | 智能客服工作台 | `00-intelligent-service.html` |
| 智能供应链 | 客户收件箱 | `01-task-workbench.html` |
| 智能供应链 | 解析审查 | `02-parse-review.html` |
| 智能供应链 | 订单 | `03-orders.html` |
| 智能供应链 | 技能工坊 | `04-skill-studio.html` |
| 客户 | 客户画像 | `05-customer-profile.html` |
| 财务对账 | 发运收货对账 | `06-financial-reconciliation.html` |
| 系统配置 | 系统配置 | `07-system-settings.html` |

## Notes

- `index.html` redirects to `00-intelligent-service.html`.
- The prototype uses a shadcn/Tailwind-inspired style with Forvia blue `#0024D3`.
- The secondary color is cyan `#00A7D8`, used for analytical, assistant, and supporting actions.
- Pages are static and use mock data only.
- Buttons and sheets are used to help identify future read models, commands, services, and state transitions.

## Context continuity 2.0 prototypes

The context-continuity exploration is kept alongside the original pages and does not replace them. This version keeps the original prototype visual language and only changes the workflow structure:

| Page | 2.0 prototype |
| --- | --- |
| 工作概览 | `00-intelligent-service-2.0.html` |
| 客户收件箱（overall list） | `01-task-workbench-2.0.html` |
| 邮件详情（mail object view） | `01-mail-detail-2.0.html` |
| 解析审查（mail-scoped task detail） | `02-parse-review-2.0.html` |
| 订单（overall table with source context） | `03-orders-2.0.html` |

Recommended flow:

`00-intelligent-service-2.0.html` -> `01-task-workbench-2.0.html` -> `01-mail-detail-2.0.html` -> `02-parse-review-2.0.html` -> `03-orders-2.0.html`
