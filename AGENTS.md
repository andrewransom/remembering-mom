<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Plan Review

When asked to review an implementation plan (referenced in the prompt), or when there is a significant change requested in a prompt, do the following: 
- carefully analyze the plan and identify any gaps, bugs, UI/UX pain points, or other issues. Report back the findings in the session. Do not make any changes to the code base Unless specifically asked .

# Plan Implementation

When asked to implement a plan referenced in the prompt, or when there is a significant change requested in a prompt and you are asked to implement that, do the following:
- Implement the plan carefully, referencing any relevant documents in the /docs folder. If the plan is a numbered milestone, then previous numbered milestones may be obsolete or out of date with respect to the current codebase. This is expected. 
- If requested, update any specs or other docs as part of the implementation plan. Do not update superseded numbered milestone plans.
- If the prompt or plan specifically requests "With sub-agent review" then:
  - When the implementation is complete, spawn a subagent to review the implementation for completeness only. Apply any valid findings from that sub-agent. 
  - When the completeness review is done, spawn an adversarial sub-agent to review the implementation carefully. It should look for any gaps, bugs, or UI pain points and report the findings back to you. Any findings that are valid, you should fix. 
  - Do not do a subagent review unless specifically asked. 
- Do not do live browser reviews or testing unless specifically asked.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
