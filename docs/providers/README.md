# Using Brain skills with any MCP-capable agent

The Brain finance skills are provider-neutral. The portable core is the Brain
MCP server at `https://mcp.brain.fi`, a standard JSON-RPC-over-HTTPS MCP surface
with OAuth 2.0 discovery (RFC 9728 protected-resource metadata). Any runtime that
speaks MCP can register it and get the same policy-gated, propose-only tools that
the Claude plugin uses.

The Claude plugin under `.claude-plugin/` is one packaging target. This directory
documents the others. Build a provider-neutral bundle with:

```bash
npm run build:portable
```

That writes `dist/portable/`:

- `skills-manifest.json` - a machine-readable index of all 11 skills (id,
  description, trigger patterns, readable scopes, propose tool, action types).
  An orchestrator on any provider can read this to route a request to a skill.
- `<skill>/instructions.md` - the skill body as a provider-neutral system
  instruction, with the manual MCP prerequisite prepended.
- `<skill>/brain-mcp.md` - the shared connection and auth contract.

## The three invariants that make this portable

1. **Point the runtime at `https://mcp.brain.fi`.** Transport is Streamable HTTP.
2. **Never embed a credential.** The host supplies the runtime bearer token; the
   server resolves tenant and scopes from it. Discovery starts from the `401`
   `WWW-Authenticate: Bearer` challenge, whose `resource_metadata` points at
   `https://mcp.brain.fi/.well-known/oauth-protected-resource`.
3. **Keep human approval between propose and execute.** There is no execute,
   settle, or sign tool on the surface. Every provider example below keeps tool
   approval on for the money-path proposals.

## Providers

- [OpenAI (Agents SDK and Responses API)](openai.md)
- [Google Gemini (google-genai SDK)](gemini.md)
- [Anthropic (Claude API MCP connector)](anthropic.md)

Field names on each provider's MCP integration change faster than this repo. The
snippets are illustrative; confirm the exact parameter names against the
provider's current MCP documentation. The three invariants above do not change.
