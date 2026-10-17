---
title: "(TBD)Harness and Self-evolving Harness"
last_modified_at: 2026-10-17
categories:
  - Blog
tags:
  - Formal
  - Study
---

The following content is largely inspired by [this paper](https://openreview.net/pdf?id=m5jsFGXUM2).

# Harness

An agent is a model with a harness. We can define a harness $H$ as the software and configuration surrounding a model $M$ that govern its execution and interaction with a task environment $E$. It's quite hard though possible to give a more concrete definition by components to harness, one possible decomposition could be:

| Component | Runtime responsibility | Mechanisms |
|---|---|---|
| Agent loop and execution control | Advances a run from one model call to the next and decides when it ends | Model invocation; tool execution; continuation and stopping rules; cancellation; error recovery |
| Tool and skill orchestration | Exposes external capability and reusable procedure to the model | Tool interfaces; registration and invocation; skill loading and invocation |
| Context construction | Assembles what the model sees on each call | System instructions; tool descriptions; conversation history; injected context |
| Memory and state management | Carries state beyond the current call or session | Reusable memory and retrieval; session persistence; resumption; forking |
| Context compaction | Keeps the assembled context within budget as a run grows | History summarization; retention and triggering policies; tool-output pruning |
| Scheduling and coordination | Distributes work beyond a single loop | Sub-agent delegation; task scheduling; background execution |
| Execution infrastructure | Bounds what a run may do and records what it did | Sandboxing; permissions and approval policies; storage; model adapters; logging and replay |

The table is from the [survey paper](https://openreview.net/pdf?id=m5jsFGXUM2).

Now let's take these defined components and investigate some real harness examples including mini-SWE-agent, DeepSeek Harness, Codex and OpenCode:

| Harness | Agent Loop & Execution Control | Tool & Skill Orchestration | Context Construction | Memory & State Management | Context Compaction | Scheduling & Coordination | Execution Infrastructure |
|---|---|---|---|---|---|---|---|
| **mini-SWE-agent (v2)** | Sequential `run → step → query → execute` loop; stopping rules, step/time/cost limits, error handling. | Bash-only interface through `Environment.execute()`; no general-purpose tool registry or native skill orchestration. | Jinja2 system/task templates plus a linear, append-only message history. | In-memory conversation state; JSON trajectory serialization. No built-in long-term memory/retrieval. | No dedicated automatic compaction mechanism in the core agent; history remains linear. | No native subagents or task scheduler; batch execution is handled by separate runners. | Pluggable local/Docker/Singularity/Bubblewrap environments; execution timeouts, trajectory logging, optional human approval. |
| **DeepSeek Harness** | Replaceable `agent-loop` plugin; event-driven turn/step lifecycle, continuation, cancellation and error recovery. | Scoped `ctx.tools` registry; skills, MCP integrations, and programmable tool orchestration via Code Mode. | Modular `systemPrompt` sections, dynamic tool schemas, session-derived history, and injected context. | Event-sourced session logs, persistence, resume and fork; cross-session memory through optional MCP integrations. | Pluggable `ctx.compaction` service; automatic/manual summarization and pruning through compaction providers. | Subagent providers, workflows, goals, background jobs, scheduled tasks, and optional Agent Teams. | Pluggable sandbox providers, approval policies, storage, LLM adapters, telemetry, and event replay. |
| **OpenAI Codex CLI** | Rust `codex-core` manages thread/turn lifecycles, streamed model calls, tool execution, continuation, and cancellation. | Built-in shell/file tools, tool routing, MCP integrations, and reusable skills. | Base/system instructions, `AGENTS.md`, conversation history, tool definitions, and runtime context. | Persistent JSONL rollouts and state database; session resume/fork; project-level instructions. | Automatic/manual compaction, with local and provider-side strategies and context preservation. | Native multi-agent delegation (`spawn_agent`, `wait_agent`, messaging); concurrent work. No general-purpose cron scheduler in the CLI core. | OS-level sandboxing, approval policies, model adapters, session logging/replay, and JSON-RPC App Server. |
| **OpenCode** | `SessionPrompt` / `SessionProcessor` implement the model-tool loop, retries, stopping, and cancellation. | Built-in tools, configurable tool registry, MCP, custom plugins, and `SKILL.md` loading. | `AGENTS.md`, configurable instructions, agent-specific prompts, session history, and tool schemas. | Database-backed sessions, resume/fork, and child sessions; external integrations for broader long-term memory. | Automatic/manual conversation summarization; configurable retention and tool-output reduction. | Built-in primary/subagent system, task delegation, and background execution; no general-purpose cron scheduler in the core. | Tool permissions (`allow/ask/deny`), persistent storage, logging, and plugins. No built-in security sandbox. |


The comparison reveals several points:

- The seven components are largely implementation independent. Although the four investigated harness are significantly different, they can mostly be projected onto the seven components. Yet that does not necessarily mean the components are actual independent software modules.

- Some components are optional and the division might not be unique. For example, context construction and context compaction can both be seen as aspects of context management. And context management need not even to use compaction. Alternatives such as truncation, external memory and tool-output pruning might be adopted instead.

- DeepSeek Harness (DSH) is especially interesting for its universal representation: everything is a plugin. 

Due to the distinction of DSH, we now take a closer look at it.

## DeepSeek Harness

