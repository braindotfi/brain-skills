# Repository Guidance

This public repository distributes the `brain-finance` plugin and its 11
proposal-only skills.

## Safety invariants

- The canonical MCP endpoint is `https://mcp.brain.fi`.
- Credentials are supplied at runtime and must never be committed.
- Skills may read declared scopes and propose actions only.
- There is no execute, settle, sign, or fund-movement step in a skill.
- Payment and Treasury use `payment_intent.propose` and have no default action.
- Vendor Risk and Compliance have a confirm/reject ceiling.
- Fraud and Anomaly may default only to notification; `freeze_card` is
  explicit-request-only.

## Required checks

Run `npm test` before publishing changes. At minimum, keep
`node scripts/check-drift.mjs` green.

## Launch preparation

- [x] Static eight-point security review
- [ ] Agensi skill-form packages
- [ ] Phase 0 verification script and runbook
- [ ] Plugin hardening and listing readiness
- [ ] Listing content drafts
