# Brain MCP contract (shared)

This file is identical across every skill in this repo. It is the connection and
authentication contract a foreign agent uses to reach Brain. Do not edit per-skill
copies independently; edit `_shared/brain-mcp.md` and re-copy.

## Endpoint

- `POST /v1/agents/mcp` on the Brain MCP server.
- JSON-RPC 2.0 over single-shot HTTPS. One request, one response, one audit event.
- Backed by the same Ledger, Wiki, and PaymentIntent code paths as Brain's HTTP API.
  There is no bypass: MCP cannot skip Policy or write the Ledger directly.

## Authentication (resolved at runtime, never embedded)

- `Authorization: Bearer <jwt>`. The JWT carries the tenant and the granted scopes.
- The JWT's on-chain `scope_hash` is verified against `BrainMCPAgentRegistry`.
- The operator supplies these credentials through the host at call time. A skill
  MUST NOT contain a token, key, tenant id, or any secret. If credentials are not
  present, surface that to the user and stop. Do not guess or fabricate them.

## Read tools (scope-gated)

| Tool | Scope | Returns |
| --- | --- | --- |
| `ledger.account.get` | `ledger:read` | one account + latest balance snapshot |
| `ledger.accounts.list` | `ledger:read` | accounts |
| `ledger.transactions.list` | `ledger:read` | transactions |
| `ledger.obligations.list` | `ledger:read` | obligations (invoices, bills) |
| `ledger.counterparties.list` | `ledger:read` | counterparties |
| `wiki.question` | `wiki:read` | answer over the entity Wiki |
| `wiki.page.get` | `wiki:read` | one Wiki page by slug or id |

Each call is scope-checked at invocation. A scope mismatch returns JSON-RPC
`-32002`. Only read the scopes a skill's metadata declares in `readable_data`.

## Propose tools (mutating, idempotency required)

Every mutating call requires a caller-supplied `idempotency_key` (per-tool,
per-tenant, per-agent; cached 24h).

### `agent.action.propose` (scope `execution:propose`)

Non-financial proposals. Used by every skill in this repo except the money-movers.

| Arg | Type | Notes |
| --- | --- | --- |
| `tenant_id` | string | required |
| `action_type` | string | one of `reconciliation_match`, `anomaly_flag`, `categorize_transaction`, `merge_counterparty`, `link_document`, `other` |
| `payload` | object | action-specific |
| `linked_entities` | array | optional `{ type, id }` refs |
| `idempotency_key` | string | required |

### `payment_intent.propose` (scope `payment_intent:propose`)

Financial proposals. Used ONLY by `brain-payment` and `brain-treasury`.

| Arg | Type | Notes |
| --- | --- | --- |
| `tenant_id` | string | required |
| `action_type` | string | one of `ach_outbound`, `ach_inbound`, `wire`, `onchain_transfer`, `erp_writeback`, `card_payment`, `x402_settle`, `escrow_release` |
| `source_account_id` | string | required |
| `destination_counterparty_id` | string | required |
| `amount` | decimal | required |
| `currency` | string | required |
| `obligation_id` | string | optional |
| `invoice_id` | string | optional |
| `idempotency_key` | string | required |

Response includes `payment_intent_id`, the `PolicyDecision`, and the next step:
`pending_approval` (with required approvers) or `approved` if policy returned `auto`.

## The no-execute boundary (applies to all skills)

There is no execute or settle tool on the MCP surface. An agent proposes and stops.
Execution is Brain-internal, behind a deterministic pre-execution gate and human
approval where policy demands it. A skill must never instruct an agent to move
funds, settle, or sign. Returning a proposal and its decision is the end of the
skill's job. Pre-execution gate failures return JSON-RPC `-32004`.
