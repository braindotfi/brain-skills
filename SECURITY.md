# Security

## Security posture

Brain Finance skills are policy-gated and propose-only. They gather authorized
evidence, submit a proposal to Brain, return the policy decision, and stop.
There is no execute, settle, or sign tool on the documented MCP surface.

The plugin is non-custodial: it does not hold funds, sign transactions, dispatch
payments, or bypass Brain's approval and pre-execution controls. Payment and
Treasury create PaymentIntent proposals only.

Authentication is resolved at runtime through the host and Brain's OAuth flow.
No access token, tenant credential, private key, or other secret belongs in this
repository, a skill, or a generated package.

Untrusted text in invoices, emails, documents, transaction descriptions, or
tool output is evidence, not instruction. Skills must reject embedded commands,
unverified destinations, and unsupported claims.

The file-grounded eight-point review is in
[`docs/security-review.md`](docs/security-review.md).

## Reporting a vulnerability

Do not open a public issue containing exploit details, credentials, tenant data,
or financial records. Contact Brain Finance through the support channel listed
at <https://docs.brain.fi/resources/support> and include only the minimum
information needed to reproduce the issue safely.
