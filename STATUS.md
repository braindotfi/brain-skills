# Build Status

Launch set: 11 skills. Build in tier order. Ship Tier 1, gather install and usage
signal, then proceed. Volume is not distribution.

## Tier 1 — ship first
- [x] brain-reconciliation  (reference implementation / clone template)
- [x] brain-subscription
- [x] brain-vendor-risk      (high-risk: confirm/reject ceiling, no auto)

## Tier 2 — fast-follow on signal
- [x] brain-collections
- [x] brain-fraud-anomaly    (notify-only; freeze_card only on explicit request)
- [x] brain-cash-forecast

## Tier 3 — only when data justifies
- [ ] brain-dispute
- [ ] brain-payment          (money-mover: payment_intent.propose)
- [ ] brain-treasury         (money-mover: payment_intent.propose)
- [ ] brain-revenue-intel    (notify-only)
- [ ] brain-compliance       (high-risk, notify-only)

## Excluded (not in this repo)
The 8 consumer agents (personal_budget, bill_management, savings,
debt_optimization, travel_finance, purchase_advisor, financial_health, tax_prep)
are intentionally not published. The marketplace install base is builders, not
retail, and publishing them re-muddies positioning during the raise and pilot.

## Per-skill definition of done
1. SKILL.md frontmatter valid; description seeded from intent_patterns, pushy.
2. brain-meta.json present; drift check passes against spec/brain-agents.json.
3. references/brain-mcp.md identical to _shared/brain-mcp.md.
4. Only real tools/scopes/action_types referenced. No invented names.
5. Zero embedded credentials. No execute/settle instruction.
6. evals/trigger.json present (should / should-not trigger prompts).
