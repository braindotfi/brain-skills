# Brain MCP contract (shared)

This file is identical across every skill in this repo. It is the connection and
authentication contract a foreign agent uses to reach Brain. Do not edit per-skill
copies independently; edit `_shared/brain-mcp.md` and re-copy.

## Endpoint

- `https://mcp.brain.fi` is the canonical public remote MCP URL.
- The plugin configures this URL automatically through its root `.mcp.json`.
- The endpoint is deployed and serves the OAuth 2.0 discovery contract below.
  Live connection tests stay gated behind a runtime token so CI needs no secret.
- Brain's internal/API compatibility route remains `POST /v1/agents/mcp`.
- JSON-RPC 2.0 over single-shot HTTPS. One request, one response, one audit event.
- Backed by the same Ledger, Wiki, and PaymentIntent code paths as Brain's HTTP API.
  There is no bypass: MCP cannot skip Policy or write the Ledger directly.

## Authentication (resolved at runtime, never embedded)

- `Authorization: Bearer <jwt>`. The JWT carries the tenant and the granted scopes.
- The JWT's on-chain `scope_hash` is verified against `BrainMCPAgentRegistry`
  on Base Sepolia testnet. Mainnet deployment and external contract audit are
  pending.
- The operator supplies these credentials through the host at call time. A skill
  MUST NOT contain a token, key, tenant id, or any secret. If credentials are not
  present, surface that to the user and stop. Do not guess or fabricate them.

### Required OAuth discovery flow

The public server is required to support the MCP OAuth 2.0 discovery sequence:

1. An unauthenticated MCP request returns HTTP `401` with a
   `WWW-Authenticate: Bearer` challenge whose `resource_metadata` value points
   to `https://mcp.brain.fi/.well-known/oauth-protected-resource`.
2. The host reads that protected-resource metadata to discover the authorization
   server and the scopes understood by Brain.
3. The host starts the authorization flow, presents the requested scopes to the
   user, and obtains explicit user consent.
4. The authorization server issues the runtime bearer token to the host. The
   token is not written into the skill or plugin.
5. Brain validates the token, tenant, and granted scopes. The token's
   `scope_hash` must match the tenant-authorized value in
   `BrainMCPAgentRegistry` on Base Sepolia testnet before a tool call is
   accepted. Mainnet deployment and external contract audit are pending.

This describes the required server contract, not proof that the public flow is
live. Phase 0 must verify the `401` challenge, metadata discovery, user consent,
token issuance, authorized read, and proposal call against
`https://mcp.brain.fi` before launch.

## Tools (scope-gated)

Each call is scope-checked at invocation. A scope mismatch returns JSON-RPC
`-32002`. The tenant is derived from the runtime bearer token. Do not pass a
`tenant_id` argument unless a tool explicitly lists one below.

### Tool overview

| Tool | Scope | Returns |
| --- | --- | --- |
| `ledger.account.get` | `ledger:read` | one account + latest balance snapshot |
| `ledger.accounts.list` | `ledger:read` | accounts |
| `ledger.transactions.list` | `ledger:read` | transactions |
| `ledger.obligations.list` | `ledger:read` | obligations (invoices, bills) |
| `ledger.counterparties.list` | `ledger:read` | counterparties |
| `wiki.question` | `wiki:read` | answer over the entity Wiki |
| `wiki.page.get` | `wiki:read` | one Wiki page by slug or id |
| `agent.action.propose` | `execution:propose` | non-financial proposal id and policy decision |
| `payment_intent.propose` | `payment_intent:propose` | financial PaymentIntent and policy decision |
| `payment_intent.cancel` | `payment_intent:propose` | cancelled PaymentIntent |
| `payment_intent.list` | `ledger:read` | the calling agent's PaymentIntents |
| `raw.artifact.get` | `raw:read` | one raw artifact's provenance and parsed evidence |
| `raw.contribute` | `raw:write` | stored raw artifact id and digest |

Only read the scopes a skill's metadata declares in `readable_data`.
`brain-payment` and `brain-treasury` use `payment_intent.propose`. Other
skills use `agent.action.propose`. `brain-dispute`, `brain-fraud-anomaly`, and
`brain-vendor-risk` use `raw.artifact.get` by raw id for source evidence. Skills
in this repo do not use `payment_intent.cancel`, `payment_intent.list`, or
`raw.contribute` unless their metadata and instructions explicitly say so.

## Tool arguments

The argument tables below are generated from `spec/brain-mcp-tools.json`, which
is a public snapshot of `brain-core/services/mcp/src/tools/*.ts`.

<!-- BEGIN GENERATED MCP TOOL ARGUMENTS -->

### `ledger.account.get` (scope `ledger:read`)

Fetch one account by id, including the most recent balance snapshot.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `account_id` | string | yes | Brain account id (acct_<ulid>) |

### `ledger.accounts.list` (scope `ledger:read`)

List the tenant's accounts. Filter by status or account_type.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | string | no | enum: active, closed, frozen, pending |
| `account_type` | string | no | - |
| `limit` | integer | no | minimum: 1; maximum: 500 |

### `ledger.transactions.list` (scope `ledger:read`)

Query transactions. Filters are optional and results are newest first.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `account_id` | string | no | - |
| `counterparty_id` | string | no | - |
| `direction` | string | no | enum: inflow, outflow, transfer, adjustment |
| `status` | string | no | enum: pending, posted, cleared, failed, reversed, disputed |
| `since` | string | no | format: date-time |
| `until` | string | no | format: date-time |
| `limit` | integer | no | minimum: 1; maximum: 1000 |

### `ledger.obligations.list` (scope `ledger:read`)

List obligations such as bills, invoices, subscriptions, rent, payroll, taxes, and card statements.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | string | no | enum: upcoming, due, paid, overdue, cancelled, disputed |
| `type` | string | no | - |
| `due_before` | string | no | format: date-time |
| `limit` | integer | no | minimum: 1; maximum: 500 |

### `ledger.counterparties.list` (scope `ledger:read`)

Search counterparties by name or type.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `q` | string | no | - |
| `type` | string | no | enum: merchant, vendor, customer, employer, bank, wallet, exchange, tax_authority, other |
| `limit` | integer | no | minimum: 1; maximum: 500 |

### `wiki.question` (scope `wiki:read`)

Ask a natural-language question about the tenant's financial state.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `question` | string | yes | minLength: 1; maxLength: 2000 |
| `as_of` | string | no | format: date-time |
| `max_evidence_depth` | integer | no | minimum: 1; maximum: 5 |

### `wiki.page.get` (scope `wiki:read`)

Fetch a wiki memory page by slug or id.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `slug_or_id` | string | yes | /accounts/acct_X \| wpg_X \| acct_X |

### `agent.action.propose` (scope `execution:propose`)

Propose a non-financial action. Brain evaluates the active policy and returns the proposal id and decision.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `action` | object | yes | additional properties allowed; Free-form action object validated against the policy DSL. Must include `kind`. |

### `payment_intent.propose` (scope `payment_intent:propose`)

Propose a financial action. Execution is not performed by this tool.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `action_type` | string | yes | enum: ach_outbound, ach_inbound, wire, onchain_transfer, erp_writeback, card_payment, x402_settle, escrow_release |
| `source_account_id` | string | yes | - |
| `destination_counterparty_id` | string | yes | - |
| `amount` | string | yes | pattern: ^\d+(\.\d+)?$ |
| `currency` | string | yes | pattern: ^[A-Z]{3,4}$ |
| `obligation_id` | string | no | - |
| `invoice_id` | string | no | - |
| `evidence_ids` | array<string> | no | - |
| `pay_to` | string | no | pattern: ^0x[0-9a-fA-F]{40}$ |
| `escrow_id` | string | no | pattern: ^0x[0-9a-fA-F]{64}$ |
| `job_terms_hash` | string | no | pattern: ^0x[0-9a-fA-F]{64}$ |

### `payment_intent.cancel` (scope `payment_intent:propose`)

Cancel a PaymentIntent the calling agent proposed while it is still cancellable.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `intent_id` | string | yes | - |

### `payment_intent.list` (scope `ledger:read`)

List the calling agent's own PaymentIntents.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `status` | string | no | enum: proposed, pending_approval, approved, paused, dispatching, rejected, executed, failed, cancelled |
| `limit` | integer | no | minimum: 1; maximum: 100 |

### `raw.artifact.get` (scope `raw:read`)

Read one tenant-scoped raw artifact's provenance metadata and parsed evidence. Does not return blob_uri or mint signed URLs.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `raw_id` | string | yes | Brain raw artifact id. |
| `include_parsed` | boolean | no | default: true; Include parser outputs for the artifact. |

### `raw.contribute` (scope `raw:write`)

Submit a raw artifact attributed to this agent.

| Arg | Type | Required | Notes |
| --- | --- | --- | --- |
| `payload` | string | yes | Artifact bytes as a string. JSON, text, or base64-encoded binary. |
| `mime_type` | string | no | default: application/json |
| `source_ref` | object | no | additional properties allowed |

<!-- END GENERATED MCP TOOL ARGUMENTS -->

## The no-execute boundary (applies to all skills)

There is no execute or settle tool on the MCP surface. An agent proposes and stops.
Execution is Brain-internal, behind a deterministic pre-execution gate and human
approval where policy demands it. A skill must never instruct an agent to move
funds, settle, or sign. Returning a proposal and its decision is the end of the
skill's job. Pre-execution gate failures return JSON-RPC `-32004`.
