# Changelog

## 0.1.0-beta.1

- Package all 11 Brain finance skills as one `brain-finance` Claude plugin.
- Add the `brain-skills` marketplace manifest.
- Configure the remote MCP endpoint at `https://mcp.brain.fi`.
- Add strict manifest, package, drift, isolated installation, and gated live
  connection smoke tests.
- Add a provider-neutral bundle (`npm run build:portable`) and `docs/providers/`
  guides for OpenAI, Google Gemini, and Anthropic.

The `https://mcp.brain.fi` endpoint is deployed and serves the OAuth 2.0
discovery contract. Phase 0, an authenticated end-to-end read and propose with
user consent, remains the release gate.
