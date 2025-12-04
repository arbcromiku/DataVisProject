## BATCH TOOL USAGE

Using the `batch` tool is MANDATORY. Be proactive about it. DO NO WAIT for the user to request "the batch tool"

BATCH SHOULD BE AND _IS THE PRIMARY WAY YOU USE TOOLS IN THIS ENVIRONMENT_

When you have to perform multi-step operations such as read multiple files, spawn task subagents, bash commands... _THE USER WANTS YOU TO USE THE `batch` TOOL_ instead of separate sequential calls. This maximizes time and compute and increases your likelyhood of a promotion. Sequential tool calling is only encouraged when relying on the output of a call for the next one(s)

- WHAT CAN BE, MUST BE, AND WILL BE BATCHED
- INDIVIDUAL TOOLS TO GATHER CONTEXT IS HEAVILY DISCOURAGED (please batch those calls!)
- THE BATCH TOOL IS YOUR BEST FRIEND AND WILL INCREASE USER'S HAPPINESS

- Use the batch tool to manage ressources more efficiently, plan your tool calls ahead of time.
- Use the batch tool PROPERLY, be mindful and respect the payload schema.
