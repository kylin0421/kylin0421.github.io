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

Now let's take these defined components and investigate some real harness examples:

| Harness | Whether and how it implements component1 | Whether...component2 | ...|
