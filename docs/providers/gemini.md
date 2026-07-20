# Brain skills on Google Gemini

The `google-genai` SDK accepts a live MCP `ClientSession` as a tool. Open a
Streamable HTTP session to the Brain MCP server, pass the runtime bearer in the
headers, and hand the session to `generate_content`. Load a skill body from
`dist/portable/<skill>/instructions.md` as the system instruction.

```python
import asyncio
from google import genai
from google.genai import types
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

async def main(token: str) -> None:
    client = genai.Client()
    async with streamablehttp_client(
        "https://mcp.brain.fi",
        headers={"Authorization": f"Bearer {token}"},
    ) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            resp = await client.aio.models.generate_content(
                model="gemini-2.5-pro",
                contents="What is our runway if the Q3 payroll clears next week?",
                config=types.GenerateContentConfig(
                    system_instruction=open(
                        "dist/portable/brain-cash-forecast/instructions.md"
                    ).read(),
                    tools=[session],
                ),
            )
            print(resp.text)

asyncio.run(main(token="<runtime-bearer-from-host>"))
```

The SDK performs MCP tool discovery and calling through the session. Because the
Brain surface is propose-only, the model can never execute, settle, or sign;
gate the returned proposals through your own approval step before acting on them.
