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
