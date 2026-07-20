# Brain skills on Anthropic (Claude)

Two paths on Claude.

## Claude Code plugin (turnkey)

This repo already is a Claude plugin. The root `.mcp.json` registers the Brain
MCP server and the 11 skills activate automatically.

```text
/plugin marketplace add braindotfi/brain-skills
/plugin install brain-finance@brain-skills
```

## Claude API (MCP connector)

For a custom agent on the Messages API, attach the Brain MCP server with the
`mcp_servers` connector. Claude calls the server directly; supply the runtime
bearer as the authorization token and load a skill body from
`dist/portable/<skill>/instructions.md` as the system prompt.

```python
from anthropic import Anthropic

client = Anthropic()
resp = client.beta.messages.create(
    model="claude-opus-4-8",
    max_tokens=2048,
    system=open("dist/portable/brain-reconciliation/instructions.md").read(),
    mcp_servers=[
        {
            "type": "url",
            "url": "https://mcp.brain.fi",
            "name": "brain",
            "authorization_token": token,
        }
    ],
    messages=[{"role": "user", "content": "Close out March."}],
    betas=["mcp-client-2025-04-04"],
)
print(resp.content)
```

The token is the runtime bearer obtained through Brain OAuth; read it from your
secret store at call time and never commit it. The propose-only invariant holds
here as everywhere: the connector exposes no execute, settle, or sign tool.
