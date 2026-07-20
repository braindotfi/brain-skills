# Brain skills on OpenAI

Two integration paths. Both point at `https://mcp.brain.fi` and defer auth to the
host. Keep tool approval on for the propose calls.

## Agents SDK (local MCP client)

The SDK connects to the Brain MCP server and exposes its tools to the agent. Load
a skill body from `dist/portable/<skill>/instructions.md` as the agent's
instructions.

```python
import asyncio
from agents import Agent, Runner
from agents.mcp import MCPServerStreamableHttp

async def main(token: str) -> None:
    async with MCPServerStreamableHttp(
        params={
            "url": "https://mcp.brain.fi",
            "headers": {"Authorization": f"Bearer {token}"},
        },
    ) as brain:
        agent = Agent(
            name="AP clerk",
            instructions=open("dist/portable/brain-payment/instructions.md").read(),
            mcp_servers=[brain],
        )
        result = await Runner.run(agent, "Prepare the approved AWS invoice for payment.")
        print(result.final_output)

asyncio.run(main(token="<runtime-bearer-from-host>"))
```

## Responses API (hosted MCP tool)

OpenAI calls the Brain MCP server directly. `require_approval` keeps a human in
the loop, which matches Brain's propose-then-approve posture for money-path
skills.

```python
from openai import OpenAI

client = OpenAI()
resp = client.responses.create(
    model="gpt-5",
    tools=[
        {
            "type": "mcp",
            "server_label": "brain",
            "server_url": "https://mcp.brain.fi",
            "headers": {"Authorization": f"Bearer {token}"},
            "require_approval": "always",
        }
    ],
    input="Reconcile March: match the bank statement to the ledger.",
)
print(resp.output_text)
```

The token is the runtime bearer the host obtained through Brain OAuth. Do not
hard-code it; read it from the host's secret store at call time.
